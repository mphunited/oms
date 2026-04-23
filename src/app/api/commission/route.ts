// src/app/api/commission/route.ts
// GET /api/commission
// Returns commission-eligible and paid orders filtered by query params.
// SALES role: automatically filtered to their own orders only.
// ADMIN / ACCOUNTING: can see all, filter by salesperson.
//
// Query params:
//   salespersonId   — filter by salesperson UUID (ADMIN/ACCOUNTING only)
//   commissionStatus — 'Eligible' | 'Commission Paid' | 'Not Eligible' | omit for all
//   invoiceStatus   — 'Not Invoiced' | 'Invoiced' | 'Paid' | omit for all
//   startDate       — YYYY-MM-DD ship date range start
//   endDate         — YYYY-MM-DD ship date range end

import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte, isNotNull, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  orders,
  order_split_loads,
  customers,
  vendors,
  users,
} from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // Fetch the current user's role and id from our users table
  const [dbUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) return new NextResponse("User not found", { status: 403 });

  const { searchParams } = new URL(req.url);
  const salespersonIdParam = searchParams.get("salespersonId");
  const commissionStatusParam = searchParams.get("commissionStatus");
  const invoiceStatusParam = searchParams.get("invoiceStatus");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const salespersonAlias = alias(users, "salesperson");
  const csrAlias = alias(users, "csr");

  const conditions = [];

  // Only show orders whose salesperson is commission-eligible
  conditions.push(eq(salespersonAlias.is_commission_eligible, true));

  // Role enforcement
  if (dbUser.role === "SALES") {
    // SALES users see only their own orders
    conditions.push(eq(orders.salesperson_id, dbUser.id));
  } else if (
    (dbUser.role === "ADMIN" || dbUser.role === "ACCOUNTING") &&
    salespersonIdParam
  ) {
    conditions.push(eq(orders.salesperson_id, salespersonIdParam));
  }

  if (commissionStatusParam) {
    conditions.push(eq(orders.commission_status, commissionStatusParam));
  }

  if (invoiceStatusParam) {
    conditions.push(eq(orders.invoice_payment_status, invoiceStatusParam));
  }

  if (startDate) conditions.push(gte(orders.ship_date, startDate));
  if (endDate) conditions.push(lte(orders.ship_date, endDate));

  const rows = await db
    .select({
      id: orders.id,
      order_number: orders.order_number,
      customer_po: orders.customer_po,
      ship_date: orders.ship_date,
      order_type: orders.order_type,
      commission_status: orders.commission_status,
      invoice_payment_status: orders.invoice_payment_status,
      qb_invoice_number: orders.qb_invoice_number,
      invoice_paid_date: orders.invoice_paid_date,
      commission_paid_date: orders.commission_paid_date,
      vendorName: vendors.name,
      customerName: customers.name,
      salespersonName: salespersonAlias.name,
      csrName: csrAlias.name,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .leftJoin(salespersonAlias, eq(orders.salesperson_id, salespersonAlias.id))
    .leftJoin(csrAlias, eq(orders.csr_id, csrAlias.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orders.ship_date);

  if (rows.length === 0) return NextResponse.json([]);

  // Fetch first split load per order for description/qty
  const orderIds = rows.map((r) => r.id);
  const splits = await db
    .select({
      order_id: order_split_loads.order_id,
      description: order_split_loads.description,
      qty: order_split_loads.qty,
    })
    .from(order_split_loads)
    .where(inArray(order_split_loads.order_id, orderIds));

  const splitMap = new Map<string, { description: string | null; qty: string | null }>();
  for (const s of splits) {
    if (!splitMap.has(s.order_id)) {
      splitMap.set(s.order_id, { description: s.description, qty: s.qty });
    }
  }

  const result = rows.map((r) => ({
    ...r,
    vendorName: r.vendorName ?? "—",
    description: splitMap.get(r.id)?.description ?? null,
    qty: splitMap.get(r.id)?.qty ?? null,
  }));

  return NextResponse.json(result);
}
