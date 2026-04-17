import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId } = await params
  const row = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customerId } = await params
  try {
    const body = await req.json()
    const { name, payment_terms, is_active, contacts, ship_to, bill_to } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (payment_terms !== undefined) updateData.payment_terms = payment_terms
    if (is_active !== undefined) updateData.is_active = is_active
    if (contacts !== undefined) updateData.contacts = contacts
    if (ship_to !== undefined) updateData.ship_to = ship_to
    if (bill_to !== undefined) updateData.bill_to = bill_to

    const [updated] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, customerId))
      .returning()
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/customers/:id]', message)
    return NextResponse.json({ error: 'Failed to update customer', detail: message }, { status: 500 })
  }
}
