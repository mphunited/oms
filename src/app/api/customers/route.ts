import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { asc } from 'drizzle-orm'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select()
    .from(customers)
    .orderBy(asc(customers.name))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, payment_terms } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const [row] = await db
      .insert(customers)
      .values({ name: name.trim(), payment_terms: payment_terms ?? null })
      .returning()
    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/customers]', message)
    return NextResponse.json({ error: 'Failed to create customer', detail: message }, { status: 500 })
  }
}
