import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, order_line_items, customers, vendors, invoices, bills_of_lading } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ tenant: string; orderId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const [customer, lineItemRows, invoice, billOfLading] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, order.customer_id) }),
    db
      .select({ lineItem: order_line_items, vendor: vendors })
      .from(order_line_items)
      .leftJoin(vendors, eq(vendors.id, order_line_items.vendor_id))
      .where(eq(order_line_items.order_id, orderId)),
    db.query.invoices.findFirst({ where: eq(invoices.order_id, orderId) }),
    db.query.bills_of_lading.findFirst({ where: eq(bills_of_lading.order_id, orderId) }),
  ]);

  const lineItems = lineItemRows.map(({ lineItem, vendor }) => ({ ...lineItem, vendor: vendor ?? null }));

  return NextResponse.json({ ...order, customer, lineItems, invoice: invoice ?? null, billOfLading: billOfLading ?? null });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const body = await req.json();

  const [order] = await db.update(orders)
    .set(body)
    .where(eq(orders.id, orderId))
    .returning();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  await db.delete(orders).where(eq(orders.id, orderId));
  return new NextResponse(null, { status: 204 });
}
