"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, company_members } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { MemberRole } from "@/types/tenant";

export async function inviteMember(
  companyId: string,
  email: string,
  name: string,
  role: MemberRole = "CSR"
) {
  // Upsert the base user record (no company-specific fields)
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  let user;
  if (existing) {
    user = existing;
  } else {
    // We can't create auth users here — insert a placeholder row.
    // In production this would be handled via Supabase invite flow.
    const [created] = await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      name,
    }).returning();
    user = created;
  }

  // Upsert the membership for this company
  const existingMember = await db.query.company_members.findFirst({
    where: and(
      eq(company_members.company_id, companyId),
      eq(company_members.user_id, user.id)
    ),
  });

  let member;
  if (existingMember) {
    const [updated] = await db.update(company_members)
      .set({ role, is_active: true })
      .where(eq(company_members.id, existingMember.id))
      .returning();
    member = updated;
  } else {
    const [created] = await db.insert(company_members).values({
      company_id: companyId,
      user_id: user.id,
      role,
    }).returning();
    member = created;
  }

  revalidatePath("/admin/team", "page");
  return member;
}

export async function updateMemberRole(memberId: string, role: MemberRole) {
  const [member] = await db.update(company_members)
    .set({ role })
    .where(eq(company_members.id, memberId))
    .returning();

  revalidatePath("/admin/team", "page");
  return member;
}

export async function removeMember(memberId: string) {
  await db.update(company_members)
    .set({ is_active: false })
    .where(eq(company_members.id, memberId));

  revalidatePath("/admin/team", "page");
}
