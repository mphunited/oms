"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, userRoleEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type UserRole = (typeof userRoleEnum.enumValues)[number]

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function inviteMember(email: string, name: string, role: UserRole = "CSR") {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { user: existing, invited: false };

  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/team", "page");
  return { user: data.user, invited: true };
}

export async function updateMemberRole(userId: string, role: UserRole) {
  const [user] = await db.update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/team", "page");
  return user;
}

export async function removeMember(userId: string) {
  await db.update(users)
    .set({ is_active: false })
    .where(eq(users.id, userId));

  revalidatePath("/team", "page");
}

export async function updateMember(
  userId: string,
  data: {
    name: string;
    title: string | null;
    phone: string | null;
    role: UserRole;
    is_active: boolean;
    email_signature: string | null;
    can_view_commission: boolean;
    is_commission_eligible: boolean;
    permissions: string[];
  }
) {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (!authUser || authError) throw new Error("Unauthorized");

  const dbUser = await db.query.users.findFirst({ where: eq(users.id, authUser.id) });
  if (!dbUser || dbUser.role !== "ADMIN") throw new Error("Forbidden: ADMIN role required");

  const [user] = await db.update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/team", "page");
  return user;
}
