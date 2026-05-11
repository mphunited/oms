import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recycling_orders, users, customers, vendors } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

const DATE_FIELDS = ['order_date', 'pick_up_date', 'delivery_date'] as const
const NUMERIC_FIELDS = ['qty', 'buy', 'sell', 'freight_cost', 'freight_credit_amount',
  'freight_to_customer', 'additional_costs', 'invoice_customer_amount'] as const

function coerce(body: Record<string, unknown>) {
  const out = { ...body }
  for (const f of DATE_FIELDS)    if (out[f] === '' || out[f] === undefined) out[f] = null
  for (const f of NUMERIC_FIELDS) if (out[f] === '' || out[f] === undefined) out[f] = null
  return out
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const order = await db.query.recycling_orders.findFirst({ where: eq(recycling_orders.id, id) })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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

  return NextResponse.json({
    ...order,
    customer_name:    customer?.name ?? null,
    customer_bill_to: customer?.bill_to ?? null,
    customer_ship_to: customer?.ship_to ?? null,
    customer_contacts_list: customer?.contacts ?? null,
    vendor_name:      vendor?.name ?? null,
    vendor_address:   vendor?.address ?? null,
    salesperson_name: salesperson?.name ?? null,
    csr_name:         csr?.name ?? null,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 403 })
  if (dbUser.role === 'SALES') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  try {
    const raw = await req.json()
    const body = coerce(raw)

    // Strip computed/relation fields before update
    const {
      customer_name, customer_bill_to, customer_ship_to, customer_contacts_list,
      vendor_name, vendor_address, salesperson_name, csr_name,
      ...updateFields
    } = body

    void customer_name; void customer_bill_to; void customer_ship_to
    void customer_contacts_list; void vendor_name; void vendor_address
    void salesperson_name; void csr_name

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [updated] = await db
      .update(recycling_orders)
      .set({ ...(updateFields as any), updated_at: new Date() })
      .where(eq(recycling_orders.id, id))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/recycling-orders/:id]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
