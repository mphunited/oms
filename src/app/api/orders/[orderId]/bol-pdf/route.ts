import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, vendors, company_settings, product_weights } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, asc, inArray } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { BillOfLadingPDF, bolDescription } from '@/lib/orders/build-bol-pdf'

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

    const uniqueNames = [...new Set(
      splitLoads.map(l => bolDescription(l.description)).filter(Boolean)
    )]
    const weightMap: Record<string, number> = {}
    if (uniqueNames.length > 0) {
      const rows = await db
        .select()
        .from(product_weights)
        .where(inArray(product_weights.product_name, uniqueNames))
      for (const r of rows) weightMap[r.product_name] = parseFloat(r.weight_lbs)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = await renderToBuffer(
      React.createElement(BillOfLadingPDF, {
        order,
        splitLoads,
        vendor: vendor ?? null,
        companySetting: companySetting ?? null,
        weightMap,
      }) as any
    )

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="BOL-${order.order_number}.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/orders/:id/bol-pdf]', message)
    return NextResponse.json({ error: 'Failed to generate BOL PDF', detail: message }, { status: 500 })
  }
}
