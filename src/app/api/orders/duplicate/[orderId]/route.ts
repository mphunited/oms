import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, users, vendors } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, sql } from 'drizzle-orm'

function deriveCommissionStatus(orderType: string | null): string {
  if (!orderType) return 'Not Eligible'
  const eligible = ['New IBC', 'Bottle', 'Rebottle', 'Washout', 'Wash & Return']
  return eligible.some(kw => orderType.includes(kw)) ? 'Eligible' : 'Not Eligible'
}

function deriveInitials(name: string | null | undefined): string {
  if (!name?.trim()) return 'XX'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? 'X').toUpperCase() + 'X'
  return ((parts[0][0] ?? 'X') + (parts[parts.length - 1][0] ?? 'X')).toUpperCase()
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = await params

    const source = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    if (!source) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const loads = await db
      .select()
      .from(order_split_loads)
      .where(eq(order_split_loads.order_id, orderId))

    const vendor = source.vendor_id
      ? await db.query.vendors.findFirst({ where: eq(vendors.id, source.vendor_id) })
      : null

    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    const initials = deriveInitials(user?.name)

    const seqResult = await db.execute(sql`SELECT nextval('order_number_seq') AS num`)
    const num = (seqResult as unknown as Array<{ num: string | number }>)[0].num
    const order_number = `${initials}-MPH${num}`

    const today = new Date().toISOString().slice(0, 10)

    const newOrder = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(orders)
        .values({
          order_number,
          customer_id:           source.customer_id,
          vendor_id:             source.vendor_id,
          ship_to:               source.ship_to,
          bill_to:               source.bill_to,
          customer_contacts:     source.customer_contacts,
          freight_carrier:       source.freight_carrier,
          terms:                 source.terms,
          additional_costs:      source.additional_costs,
          order_type:            source.order_type,
          salesperson_id:        source.salesperson_id,
          csr_id:                source.csr_id,
          po_notes:              source.po_notes,
          freight_invoice_notes: source.freight_invoice_notes,
          shipper_notes:         source.shipper_notes,
          misc_notes:            source.misc_notes,
          is_blind_shipment:     source.is_blind_shipment,
          // reset fields
          order_date:            today,
          status:                'Pending',
          ship_date:             null,
          wanted_date:           null,
          appointment_time:      null,
          appointment_notes:     null,
          customer_po:           null,
          flag:                  false,
          is_revised:            false,
          invoice_payment_status: 'Not Invoiced',
          commission_status:     deriveCommissionStatus(source.order_type),
          qb_invoice_number:     null,
          sales_order_number:    null,
          checklist:             vendor?.checklist_template ?? null,
        })
        .returning({ id: orders.id })

      if (loads.length > 0) {
        await tx.insert(order_split_loads).values(
          loads.map(load => ({
            order_id:             inserted.id,
            description:          load.description,
            part_number:          load.part_number,
            bottle_cost:          load.bottle_cost,
            bottle_qty:           load.bottle_qty,
            mph_freight_bottles:  load.mph_freight_bottles,
            order_number_override: load.order_number_override,
            buy:                  null,
            sell:                 null,
            qty:                  null,
          }))
        )
      }

      return inserted
    })

    return NextResponse.json({ id: newOrder.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/orders/duplicate/:id]', message)
    return NextResponse.json({ error: 'Failed to duplicate order', detail: message }, { status: 500 })
  }
}
