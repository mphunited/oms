"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users, userRoleEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type UserRole = (typeof userRoleEnum.enumValues)[number]

export async function inviteMember(email: string, name: string, role: UserRole = "CSR") {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return existing;

  const [created] = await db.insert(users).values({
    id: crypto.randomUUID(),
    email,
    name,
    role,
  }).returning();

  revalidatePath("/team", "page");
  return created;
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
