import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, vendors, order_groups, customers } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, asc, inArray } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { PurchaseOrderPDF } from '@/lib/orders/build-po-pdf'
import { MultiShipToPDF, type MultiShipToOrder } from '@/lib/orders/build-multi-ship-to-pdf'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = await params

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const vendor = order.vendor_id
      ? await db.query.vendors.findFirst({ where: eq(vendors.id, order.vendor_id) })
      : null

    const companySetting = await db.query.company_settings.findFirst()

    // ── Multi-ship-to group path ──────────────────────────────────────────────
    if (order.group_id) {
      const group = await db.query.order_groups.findFirst({
        where: eq(order_groups.id, order.group_id),
      })
      if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

      const siblingOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.group_id, order.group_id))
        .orderBy(asc(orders.created_at))

      const siblingIds = siblingOrders.map(o => o.id)
      const allLoads = siblingIds.length > 0
        ? await db
            .select()
            .from(order_split_loads)
            .where(inArray(order_split_loads.order_id, siblingIds))
            .orderBy(asc(order_split_loads.created_at))
        : []

      const customerIds = siblingOrders.map(o => o.customer_id).filter(Boolean) as string[]
      const customerRows = customerIds.length > 0
        ? await db
            .select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(inArray(customers.id, customerIds))
        : []
      const customerMap = new Map(customerRows.map(c => [c.id, c.name]))

      const multiOrders: MultiShipToOrder[] = siblingOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_id ? (customerMap.get(o.customer_id) ?? null) : null,
        customer_po: o.customer_po ?? null,
        ship_date: o.ship_date ?? null,
        appointment_time: o.appointment_time ? o.appointment_time.toISOString() : null,
        appointment_notes: o.appointment_notes ?? null,
        po_notes: o.po_notes ?? null,
        freight_carrier: o.freight_carrier ?? null,
        ship_to: o.ship_to as MultiShipToOrder['ship_to'],
        split_loads: allLoads.filter(l => l.order_id === o.id),
      }))

      const pdf = await renderToBuffer(
        React.createElement(MultiShipToPDF, {
          group: { group_po_number: group.group_po_number },
          orders: multiOrders,
          vendor: vendor
            ? { name: vendor.name, address: vendor.address as { city?: string; state?: string; street?: string; zip?: string } | null, lead_contact: vendor.lead_contact ?? null }
            : null,
          companySetting: companySetting ?? null,
        }) as any // eslint-disable-line @typescript-eslint/no-explicit-any
      )

      return new Response(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="MPH PO ${group.group_po_number} Multi-Ship-To.pdf"`,
          'X-Group-Po-Number': group.group_po_number,
        },
      })
    }

    // ── Single-order path ─────────────────────────────────────────────────────
    const splitLoads = await db
      .select()
      .from(order_split_loads)
      .where(eq(order_split_loads.order_id, orderId))
      .orderBy(asc(order_split_loads.created_at))

    const pdf = await renderToBuffer(
      React.createElement(PurchaseOrderPDF, {
        order,
        splitLoads,
        vendor: vendor ?? null,
        companySetting: companySetting ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    )

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${order.order_number}.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/orders/:id/po-pdf]', message)
    return NextResponse.json({ error: 'Failed to generate PDF', detail: message }, { status: 500 })
  }
}
