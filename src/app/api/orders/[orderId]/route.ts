import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, customers, vendors, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

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
    const body = await req.json()
    const { split_loads, ...orderFields } = body

    for (const key of ['order_date', 'ship_date', 'wanted_date', 'appointment_time', 'csr_id', 'csr2_id']) {
      if (orderFields[key] === '') orderFields[key] = null
    }

    orderFields.updated_at = new Date()

    const NUMERIC_FIELDS = ['qty', 'buy', 'sell', 'bottle_cost', 'bottle_qty', 'mph_freight_bottles']

    await db.transaction(async (tx) => {
      await tx.update(orders).set(orderFields).where(eq(orders.id, orderId))

      if (Array.isArray(split_loads)) {
        await tx.delete(order_split_loads).where(eq(order_split_loads.order_id, orderId))
        if (split_loads.length > 0) {
          await tx.insert(order_split_loads).values(
            split_loads.map((load: any) => {
              const clean: any = { ...load, order_id: orderId }
              for (const field of NUMERIC_FIELDS) {
                if (clean[field] === '' || clean[field] === undefined) clean[field] = null
              }
              return clean
            })
          )
        }
      }
    })

    const updated = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/orders/:id]', message)
    return NextResponse.json({ error: 'Failed to update order', detail: message }, { status: 500 })
  }
}