import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, vendors, company_settings } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, asc } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { PurchaseOrderPDF } from '@/lib/orders/build-po-pdf'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = await params

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const splitLoads = await db
      .select()
      .from(order_split_loads)
      .where(eq(order_split_loads.order_id, orderId))
      .orderBy(asc(order_split_loads.created_at))

    const vendor = order.vendor_id
      ? await db.query.vendors.findFirst({ where: eq(vendors.id, order.vendor_id) })
      : null

    const companySetting = await db.query.company_settings.findFirst()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = await renderToBuffer(
      React.createElement(PurchaseOrderPDF, {
        order,
        splitLoads,
        vendor: vendor ?? null,
        companySetting: companySetting ?? null,
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
