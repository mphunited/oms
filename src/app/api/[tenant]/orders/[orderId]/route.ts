import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ tenant: string; orderId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      lineItems: { include: { vendor: true } },
      invoice: true,
      billOfLading: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  const body = await req.json();

  const order = await prisma.order.update({
    where: { id: orderId },
    data: body,
  });

  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { orderId } = await params;
  await prisma.order.delete({ where: { id: orderId } });
  return new NextResponse(null, { status: 204 });
}
