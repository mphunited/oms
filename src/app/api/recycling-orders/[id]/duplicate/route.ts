import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recycling_orders, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, sql } from 'drizzle-orm'
import { deriveInitials } from '@/lib/orders/commission-eligibility'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) })
    if (!dbUser || dbUser.role === 'SALES') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const source = await db.query.recycling_orders.findFirst({ where: eq(recycling_orders.id, id) })
    if (!source) return NextResponse.json({ error: 'Recycling order not found' }, { status: 404 })

    const initials = deriveInitials(dbUser.name)
    const seqResult = await db.execute(sql`SELECT nextval('order_number_seq') AS num`)
    const num = (seqResult as unknown as Array<{ num: string | number }>)[0].num
    const order_number = `${initials}-MPH${num}`

    const today = new Date().toISOString().slice(0, 10)

    const [inserted] = await db
      .insert(recycling_orders)
      .values({
        order_number,
        order_date:             today,
        order_type:             source.order_type,
        customer_id:            source.customer_id,
        vendor_id:              source.vendor_id,
        salesperson_id:         source.salesperson_id,
        csr_id:                 source.csr_id,
        status:                 'Acknowledged Order',
        customer_po:            source.customer_po,
        pick_up_date:           null,
        delivery_date:          null,
        ship_from:              source.ship_from,
        ship_to:                source.ship_to,
        bill_to:                source.bill_to,
        customer_contacts:      source.customer_contacts,
        freight_carrier:        source.freight_carrier,
        freight_cost:           source.freight_cost,
        freight_to_customer:    source.freight_to_customer,
        freight_credit_amount:  source.freight_credit_amount,
        additional_costs:       source.additional_costs ?? '0',
        invoice_status:         source.invoice_status,
        invoice_customer_amount: source.invoice_customer_amount,
        invoice_payment_status: 'Not Invoiced',
        terms:                  source.terms,
        bol_number:             null,
        po_notes:               source.po_notes,
        misc_notes:             source.misc_notes,
        recycling_type:         source.recycling_type,
        qty:                    source.qty,
        buy:                    source.buy,
        sell:                   source.sell,
        description:            source.description,
        part_number:            null,
        appointment_notes:      null,
        po_contacts:            source.po_contacts,
        qb_invoice_number:      null,
        is_blind_shipment:      source.is_blind_shipment,
        flag:                   false,
        checklist:              source.checklist,
        commission_status:      'Not Eligible',
      })
      .returning({ id: recycling_orders.id, recycling_type: recycling_orders.recycling_type })

    return NextResponse.json({ id: inserted.id, recycling_type: inserted.recycling_type }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/recycling-orders/:id/duplicate]', message)
    return NextResponse.json({ error: 'Failed to duplicate recycling order', detail: message }, { status: 500 })
  }
}
