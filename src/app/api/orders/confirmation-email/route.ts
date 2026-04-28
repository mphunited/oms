// src/app/api/orders/confirmation-email/route.ts
// Fetches order data and builds confirmation email payload.
// Does NOT call Graph API — the browser client handles that.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, vendors, customers } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { buildConfirmationEmail } from '@/lib/orders/build-confirmation-email'
import type { ConfirmationOrder } from '@/lib/orders/build-confirmation-email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { orderIds?: string[] }
  const orderIds = body.orderIds
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: 'orderIds required' }, { status: 400 })
  }

  const rows = await db
    .select({
      order: orders,
      vendor: vendors,
      customer: customers,
    })
    .from(orders)
    .leftJoin(vendors, eq(orders.vendor_id, vendors.id))
    .leftJoin(customers, eq(orders.customer_id, customers.id))
    .where(inArray(orders.id, orderIds))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Orders not found' }, { status: 404 })
  }

  const uniqueCustomers = new Set(rows.map(r => r.order.customer_id))
  if (uniqueCustomers.size > 1) {
    return NextResponse.json(
      { error: 'Selected orders belong to multiple customers. Please select orders for one customer only.' },
      { status: 400 }
    )
  }

  const loads = await db
    .select()
    .from(order_split_loads)
    .where(inArray(order_split_loads.order_id, orderIds))

  const loadsByOrder = new Map<string, typeof loads>()
  for (const load of loads) {
    const existing = loadsByOrder.get(load.order_id) ?? []
    existing.push(load)
    loadsByOrder.set(load.order_id, existing)
  }

  const confirmationOrders: ConfirmationOrder[] = rows.map(r => {
    const addr = r.vendor?.address as { street?: string; city?: string; state?: string; zip?: string } | null
    const contacts = r.order.customer_contacts as Array<{ name?: string; email?: string; is_primary?: boolean }> | null
    const shipTo = r.order.ship_to as { name?: string; street?: string; street2?: string; city?: string; state?: string; zip?: string } | null
    const orderLoads = (loadsByOrder.get(r.order.id) ?? []).map(l => ({
      order_number_override: l.order_number_override,
      customer_po: l.customer_po,
      description: l.description,
      qty: l.qty,
      sell: l.sell,
      ship_date: l.ship_date,
    }))

    return {
      id: r.order.id,
      order_number: r.order.order_number,
      customer_name: r.customer?.name ?? '',
      customer_po: r.order.customer_po,
      freight_carrier: r.order.freight_carrier,
      wanted_date: r.order.wanted_date,
      ship_to: shipTo,
      payment_terms: r.order.terms,
      vendor_name: r.vendor?.name ?? null,
      vendor_address: addr,
      vendor_dock_info: r.vendor?.dock_info ?? null,
      split_loads: orderLoads,
      customer_contacts: contacts,
    }
  })

  const emailData = buildConfirmationEmail(confirmationOrders)
  return NextResponse.json(emailData)
}
