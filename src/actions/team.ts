"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, userRoleEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type UserRole = (typeof userRoleEnum.enumValues)[number]

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (!authUser || authError) throw new Error("Unauthorized");

  const dbUser = await db.query.users.findFirst({ where: eq(users.id, authUser.id) });
  if (!dbUser || dbUser.role !== "ADMIN") throw new Error("Forbidden: ADMIN role required");
}

export async function updateMemberRole(userId: string, role: UserRole) {
  await requireAdmin();

  const [user] = await db.update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/team", "page");
  return user;
}

export async function removeMember(userId: string) {
  await requireAdmin();

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
