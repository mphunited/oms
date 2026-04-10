"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orders, order_line_items } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import type { CreateOrderInput, UpdateOrderStatusInput } from "@/types/order";

function generateOrderNumber(currentCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(currentCount + 1).padStart(4, "0");
  return `ORD-${year}-${seq}`;
}

export async function createOrder(companyId: string, input: CreateOrderInput) {
  // Count existing orders for this company to generate order number
  const [{ value: orderCount }] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.company_id, companyId));

  const [order] = await db.insert(orders).values({
    company_id: companyId,
    customer_id: input.customerId,
    order_number: generateOrderNumber(Number(orderCount)),
    salesperson: input.salesperson,
    csr: input.csr,
    notes: input.notes,
    ship_date: input.shipDate ? input.shipDate.toISOString().split('T')[0] : null,
    delivery_date: input.deliveryDate ? input.deliveryDate.toISOString().split('T')[0] : null,
  }).returning();

  if (input.lineItems.length > 0) {
    await db.insert(order_line_items).values(
      input.lineItems.map((item) => ({
        order_id: order.id,
        vendor_id: item.vendorId ?? null,
        description: item.description,
        qty: String(item.qty),
        buy_each: String(item.buyEach),
        sell_each: String(item.sellEach),
        freight_cost: String(item.freightCost ?? 0),
        split_load: item.splitLoad ?? false,
      }))
    );
  }

  const lineItems = await db
    .select()
    .from(order_line_items)
    .where(eq(order_line_items.order_id, order.id));

  revalidatePath("/orders", "page");
  return { ...order, lineItems };
}

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const [order] = await db.update(orders)
    .set({
      status: input.status,
      flag: input.flag,
    })
    .where(eq(orders.id, input.orderId))
    .returning();

  revalidatePath("/orders", "page");
  return order;
}

export async function deleteOrder(orderId: string) {
  await db.delete(orders).where(eq(orders.id, orderId));
  revalidatePath("/orders");
}
