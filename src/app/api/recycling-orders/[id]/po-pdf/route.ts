import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recycling_orders, customers, vendors } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'
import { renderToBuffer, DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { RecyclingPurchaseOrderPDF } from '@/lib/recycling/build-recycling-po-pdf'

export const runtime = 'nodejs'

type PoContact = { name?: string; email?: string; role?: 'to' | 'cc' }

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const order = await db.query.recycling_orders.findFirst({ where: eq(recycling_orders.id, id) })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const customer = await db.query.customers.findFirst({ where: eq(customers.id, order.customer_id) })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const vendor = order.vendor_id
      ? await db.query.vendors.findFirst({ where: eq(vendors.id, order.vendor_id) })
      : null

    const companySetting = await db.query.company_settings.findFirst()

    const pdf = await renderToBuffer(
      React.createElement(RecyclingPurchaseOrderPDF, {
        order: {
          order_number:      order.order_number,
          order_date:        order.order_date ?? null,
          customer_po:       order.customer_po ?? null,
          recycling_type:    order.recycling_type,
          description:       order.description ?? null,
          part_number:       order.part_number ?? null,
          qty:               order.qty ?? null,
          buy:               order.buy ?? null,
          freight_carrier:   order.freight_carrier ?? null,
          pick_up_date:      order.pick_up_date ?? null,
          po_notes:          order.po_notes ?? null,
          is_blind_shipment: order.is_blind_shipment,
          ship_from:         order.ship_from ?? null,
        },
        customer: {
          name:    customer.name,
          bill_to: customer.bill_to ?? null,
          ship_to: customer.ship_to ?? null,
        },
        vendor: vendor
          ? { name: vendor.name, address: vendor.address ?? null }
          : null,
        companySetting: companySetting ?? null,
      }) as React.ReactElement<DocumentProps>
    )

    // Build email headers from po_contacts
    const poContacts = (order.po_contacts ?? []) as PoContact[]
    const toContacts = poContacts.filter(c => c.role === 'to')
    const ccContacts = poContacts.filter(c => c.role === 'cc')

    const emailTo = toContacts
      .filter(c => c.email)
      .map(c => c.name ? `${c.name} <${c.email}>` : c.email!)
      .join(', ')

    const emailCc = [
      ...ccContacts.filter(c => c.email).map(c => c.name ? `${c.name} <${c.email}>` : c.email!),
      ...(order.recycling_type === 'IBC' ? ['orders@mphunited.com'] : []),
    ].join(', ')

    const shipDateStr = fmtDate(order.pick_up_date)
    const subject = (order.is_blind_shipment || order.recycling_type === 'Drum')
      ? `MPH United PO ${order.order_number} | Ship ${shipDateStr}`
      : `MPH United PO ${order.order_number} -- ${customer.name} | Ship ${shipDateStr}`

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type':             'application/pdf',
        'Content-Disposition':      `attachment; filename="MPH PO ${order.order_number}.pdf"`,
        'x-email-to':               emailTo,
        'x-email-cc':               emailCc,
        'x-email-subject':          subject,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/recycling-orders/:id/po-pdf]', msg)
    return NextResponse.json({ error: 'Failed to generate PDF', detail: msg }, { status: 500 })
  }
}
