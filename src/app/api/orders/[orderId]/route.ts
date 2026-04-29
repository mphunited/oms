import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, vendors, users, order_type_configs, type NewOrderSplitLoad } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq, sql } from 'drizzle-orm'
import { deriveLoadCommissionStatus, deriveOrderCommissionStatus, deriveInitials } from '@/lib/orders/commission-eligibility'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const loads = await db
    .select()
    .from(order_split_loads)
    .where(eq(order_split_loads.order_id, orderId))

  const customer = order.customer_id
    ? await db.query.customers.findFirst({ where: eq(customers.id, order.customer_id) })
    : null

  const vendor = order.vendor_id
    ? await db.query.vendors.findFirst({ where: eq(vendors.id, order.vendor_id) })
    : null

  const salesperson = order.salesperson_id
    ? await db.query.users.findFirst({ where: eq(users.id, order.salesperson_id) })
    : null

  const csr = order.csr_id
    ? await db.query.users.findFirst({ where: eq(users.id, order.csr_id) })
    : null

  const csr2 = order.csr2_id
    ? await db.query.users.findFirst({ where: eq(users.id, order.csr2_id) })
    : null

  return NextResponse.json({
    ...order,
    split_loads: loads,
    customer_name: customer?.name ?? null,
    vendor_name: vendor?.name ?? null,
    salesperson_name: salesperson?.name ?? null,
    csr_name: csr?.name ?? null,
    csr2_name: csr2?.name ?? null,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    const initials = deriveInitials(user?.name)

    const body = await req.json()
    const { split_loads, ...orderFields } = body

    // Only allow checklist updates when it is the sole field in the body (sent by the checklist popup).
    // Full-form saves from the edit page must never overwrite the checklist column.
    if (!('checklist' in body) || Object.keys(body).length > 1) {
      delete orderFields.checklist
    }

    for (const key of ['order_date', 'ship_date', 'wanted_date', 'appointment_time', 'csr_id', 'csr2_id', 'salesperson_id', 'vendor_id', 'customer_id']) {
      if (orderFields[key] === '') orderFields[key] = null
    }

    orderFields.updated_at = new Date()
    delete orderFields.commission_status

    const allConfigs = await db.select({ order_type: order_type_configs.order_type, is_commission_eligible: order_type_configs.is_commission_eligible }).from(order_type_configs)
    const configMap = new Map(allConfigs.map(c => [c.order_type, c.is_commission_eligible]))

    const NUMERIC_FIELDS = ['qty', 'buy', 'sell', 'bottle_cost', 'bottle_qty', 'mph_freight_bottles']

    await db.transaction(async (tx) => {
      if (Array.isArray(split_loads)) {
        await tx.delete(order_split_loads).where(eq(order_split_loads.order_id, orderId))

        if (split_loads.length > 0) {
          const loadValues: Record<string, unknown>[] = split_loads.map((load: Record<string, unknown>) => {
            const clean: Record<string, unknown> = { order_id: orderId }
            const ALLOWED_LOAD_FIELDS = [
              'id', 'description', 'part_number', 'qty', 'buy', 'sell',
              'bottle_cost', 'bottle_qty', 'mph_freight_bottles',
              'order_number_override', 'customer_po', 'order_type',
              'ship_date', 'wanted_date', 'commission_paid_date',
            ]
            for (const field of ALLOWED_LOAD_FIELDS) {
              if (field in load) clean[field] = (load as Record<string, unknown>)[field]
            }
            for (const field of NUMERIC_FIELDS) {
              if (clean[field] === '' || clean[field] === undefined) clean[field] = null
            }
            clean.commission_status = deriveLoadCommissionStatus(clean.order_type as string, configMap)
            return clean
          })

          // Handle separate_po: generate PO for loads that need their own
          for (const lv of loadValues) {
            if (lv.separate_po) {
              const seqRes = await tx.execute(sql`SELECT nextval('order_number_seq') AS num`)
              const num = (seqRes as unknown as Array<{ num: string | number }>)[0].num
              lv.order_number_override = `${initials}-MPH${num}`
            }
            delete lv.separate_po
            delete lv.preview_po
          }

          await tx.insert(order_split_loads).values(loadValues as NewOrderSplitLoad[])

          const orderCommissionStatus = deriveOrderCommissionStatus(
            loadValues.map(l => ({
              commission_status: l.commission_status as string,
              commission_paid_date: (l.commission_paid_date as string) ?? null,
            }))
          )
          orderFields.commission_status = orderCommissionStatus
        } else {
          orderFields.commission_status = 'Not Eligible'
        }
      }

      await tx.update(orders).set(orderFields).where(eq(orders.id, orderId))
    })

    const updated = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/orders/:id]', message)
    return NextResponse.json({ error: 'Failed to update order', detail: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orderId } = await params

  try {
    await db.delete(orders).where(eq(orders.id, orderId))
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[DELETE /api/orders/:id]', message)
    return NextResponse.json({ error: 'Failed to delete order', detail: message }, { status: 500 })
  }
}