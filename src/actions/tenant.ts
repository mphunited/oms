"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function inviteMember(
  companyId: string,
  email: string,
  name: string,
  role: UserRole = "CSR"
) {
  // Upsert the base user record (no company-specific fields)
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name },
    update: {},
  });

  // Upsert the membership for this company
  const member = await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId, userId: user.id } },
    create: { companyId, userId: user.id, role },
    update: { role, isActive: true },
  });

  revalidatePath("/admin/team", "page");
  return member;
}

export async function updateMemberRole(memberId: string, role: UserRole) {
  const member = await prisma.companyMember.update({
    where: { id: memberId },
    data: { role },
  });

  revalidatePath("/admin/team", "page");
  return member;
}

export async function removeMember(memberId: string) {
  await prisma.companyMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  revalidatePath("/admin/team", "page");
}
