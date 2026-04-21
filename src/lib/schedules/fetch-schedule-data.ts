// src/lib/schedules/fetch-schedule-data.ts
// Shared data fetching logic for admin and vendor schedule API routes.
// Queries orders joined to customers, vendors, users within a ship_date range.
// Only returns orders with a ship_date set (no ship_date = excluded per PRD).

import { db } from "@/lib/db";
import { orders, order_split_loads, customers, vendors, users } from "@/lib/db/schema";
import { and, gte, lte, eq, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface ScheduleOrderRow {
  id: string;
  order_number: string;
  customer_po: string | null;
  ship_date: string;
  appointment_time: Date | null;
  freight_carrier: string | null;
  po_notes: string | null;
  is_blind_shipment: boolean;
  vendorName: string;
  vendorId: string;
  customerName: string;
  salespersonName: string | null;
  csrName: string | null;
  shipTo: Record<string, string> | null;
  // line item aggregates (first line item only for schedule display)
  description: string | null;
  part_number: string | null;
  qty: string | null;
  buy: string | null;
  sell: string | null;
}

export async function fetchScheduleOrders(
  startDate: string,
  endDate: string,
  vendorId?: string,        // undefined = all vendors (admin schedule)
  frontlineOnly?: boolean,  // true = filter by freight_carrier = 'Frontline'
): Promise<ScheduleOrderRow[]> {
  const salespersonAlias = alias(users, "salesperson");
  const csrAlias = alias(users, "csr");

  const conditions = [
    isNotNull(orders.ship_date),
    gte(orders.ship_date, startDate),
    lte(orders.ship_date, endDate),
  ];

  if (vendorId) {
    conditions.push(eq(orders.vendor_id, vendorId));
  }

  if (frontlineOnly) {
    conditions.push(eq(orders.freight_carrier, "Frontline"));
  }

  // Fetch orders with joins
  const rows = await db
    .select({
      id: orders.id,
      order_number: orders.order_number,
      customer_po: orders.customer_po,
      ship_date: orders.ship_date,
      appointment_time: orders.appointment_time,
      freight_carrier: orders.freight_carrier,
      po_notes: orders.po_notes,
      is_blind_shipment: orders.is_blind_shipment,
      vendorId: vendors.id,
      vendorName: vendors.name,
      customerName: customers.name,
      salespersonName: salespersonAlias.name,
      csrName: csrAlias.name,
      shipTo: orders.ship_to,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customer_id, customers.id))
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .leftJoin(salespersonAlias, eq(orders.salesperson_id, salespersonAlias.id))
    .leftJoin(csrAlias, eq(orders.csr_id, csrAlias.id))
    .where(and(...conditions))
    .orderBy(orders.ship_date, vendors.name);

  if (rows.length === 0) return [];

  // Fetch first split load per order for description/qty/pricing
  const orderIds = rows.map((r) => r.id);
  const splitRows = await db
    .select({
      order_id: order_split_loads.order_id,
      description: order_split_loads.description,
      part_number: order_split_loads.part_number,
      qty: order_split_loads.qty,
      buy: order_split_loads.buy,
      sell: order_split_loads.sell,
    })
    .from(order_split_loads)
    .where(
      // Use inArray when available; fall back to manual filter
      // Drizzle inArray requires the ids array to be non-empty (checked above)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order_split_loads as any).order_id.in(orderIds)
    );

  // Map split loads by order_id (first row wins)
  const splitMap = new Map<string, typeof splitRows[0]>();
  for (const s of splitRows) {
    if (!splitMap.has(s.order_id)) splitMap.set(s.order_id, s);
  }

  return rows.map((r) => {
    const split = splitMap.get(r.id);
    return {
      ...r,
      ship_date: r.ship_date as string,
      vendorName: r.vendorName ?? "Unknown Vendor",
      vendorId: r.vendorId ?? "",
      shipTo: r.shipTo as Record<string, string> | null,
      description: split?.description ?? null,
      part_number: split?.part_number ?? null,
      qty: split?.qty ?? null,
      buy: split?.buy ?? null,
      sell: split?.sell ?? null,
    };
  });
}
