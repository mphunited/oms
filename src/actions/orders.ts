"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CreateOrderInput, UpdateOrderStatusInput } from "@/types/order";
import type { OrderStatus } from "@prisma/client";

function generateOrderNumber(count: number): string {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(4, "0");
  return `ORD-${year}-${seq}`;
}

export async function createOrder(companyId: string, input: CreateOrderInput) {
  const count = await prisma.order.count({ where: { companyId } });

  const order = await prisma.order.create({
    data: {
      companyId,
      customerId: input.customerId,
      orderNumber: generateOrderNumber(count),
      salesperson: input.salesperson,
      csr: input.csr,
      notes: input.notes,
      shipDate: input.shipDate,
      deliveryDate: input.deliveryDate,
      lineItems: {
        create: input.lineItems.map((item) => ({
          vendorId: item.vendorId,
          description: item.description,
          qty: item.qty,
          buyEach: item.buyEach,
          sellEach: item.sellEach,
          freightCost: item.freightCost ?? 0,
          splitLoad: item.splitLoad ?? false,
        })),
      },
    },
    include: { lineItems: true, customer: true },
  });

  revalidatePath("/orders", "page");
  return order;
}

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const order = await prisma.order.update({
    where: { id: input.orderId },
    data: {
      status: input.status as OrderStatus,
      flag: input.flag,
    },
  });

  revalidatePath("/orders", "page");
  return order;
}

export async function deleteOrder(orderId: string) {
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath("/orders");
}
