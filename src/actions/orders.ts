"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function updateOrderStatus(orderId: string, status: string, flag?: boolean) {
  const [order] = await db
    .update(orders)
    .set({ status, ...(flag !== undefined ? { flag } : {}) })
    .where(eq(orders.id, orderId))
    .returning();

  revalidatePath("/orders", "page");
  return order;
}

export async function deleteOrder(orderId: string) {
  await db.delete(orders).where(eq(orders.id, orderId));
  revalidatePath("/orders");
}
