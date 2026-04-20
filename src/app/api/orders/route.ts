import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, order_split_loads, users, vendors } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

function deriveCommissionStatus(orderType: string): string {
  const eligible = ['New IBC', 'Bottle', 'Rebottle', 'Washout', 'Wash & Return']
  return eligible.some(kw => orderType.includes(kw)) ? 'Eligible' : 'Not Eligible'
}

function deriveInitials(name: string | null | undefined): string {
  if (!name?.trim()) return 'XX'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? 'X').toUpperCase() + 'X'
  return ((parts[0][0] ?? 'X') + (parts[parts.length - 1][0] ?? 'X')).toUpperCase()
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    const initials = deriveInitials(user?.name)

    const body = await req.json()
    const { split_loads, ...orderFields } = body
    for (const key of ['order_date', 'ship_date', 'wanted_date', 'appointment_time']) {
      if (orderFields[key] === '') orderFields[key] = null
    }

    const seqResult = await db.execute(sql`SELECT nextval('order_number_seq') AS num`)
    const num = (seqResult as unknown as Array<{ num: string | number }>)[0].num
    const order_number = `${initials}-MPH${num}`

    const commission_status = deriveCommissionStatus(orderFields.order_type ?? '')

    let checklist: unknown = null
    if (orderFields.vendor_id) {
      const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.id, orderFields.vendor_id),
      })
      checklist = vendor?.checklist_template ?? null
    }

    const result = await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values({ ...orderFields, order_number, commission_status, checklist })
        .returning({ id: orders.id, order_number: orders.order_number })

      if (split_loads?.length) {
        await tx.insert(order_split_loads).values(
          split_loads.map((load: any) => ({ ...load, order_id: newOrder.id }))
        )
      }

      return newOrder
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/orders]', message)
    return NextResponse.json({ error: 'Failed to create order', detail: message }, { status: 500 })
  }
}
