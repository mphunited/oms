import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies, orders, customers, order_line_items } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

interface RouteContext {
  params: Promise<{ tenant: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { tenant: companyId } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);

  const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const conditions = [eq(orders.company_id, company.id)];
  if (status) conditions.push(eq(orders.status, status));
  const where = and(...conditions);

  const [orderRows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: orders.id,
        company_id: orders.company_id,
        order_number: orders.order_number,
        customer_id: orders.customer_id,
        status: orders.status,
        salesperson: orders.salesperson,
        csr: orders.csr,
        ship_date: orders.ship_date,
        delivery_date: orders.delivery_date,
        customer_po: orders.customer_po,
        freight_carrier: orders.freight_carrier,
        appointment_time: orders.appointment_time,
        appointment_notes: orders.appointment_notes,
        po_notes: orders.po_notes,
        freight_notes: orders.freight_notes,
        shipper_notes: orders.shipper_notes,
        misc_notes: orders.misc_notes,
        terms: orders.terms,
        notes: orders.notes,
        flag: orders.flag,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        customer: {
          id: customers.id,
          name: customers.name,
        },
      })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customer_id))
      .where(where)
      .orderBy(desc(orders.created_at))
      .offset((page - 1) * limit)
      .limit(limit),
    db.select({ value: count() }).from(orders).where(where),
  ]);

  return NextResponse.json({ orders: orderRows, total: Number(total), page, limit });
}
