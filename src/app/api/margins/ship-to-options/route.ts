import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { orders, users } from '@/lib/db/schema'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const customerId = req.nextUrl.searchParams.get('customerId')
  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
  }

  const rows = await db
    .selectDistinct({ shipTo: orders.ship_to })
    .from(orders)
    .where(
      and(
        eq(orders.customer_id, customerId),
        isNotNull(orders.ship_to),
        sql`${orders.ship_to}->>'name' IS NOT NULL`,
      )
    )

  type ShipToObj = { name?: string; city?: string; state?: string }

  const seen = new Set<string>()
  const options: { key: string; label: string }[] = []

  for (const row of rows) {
    const s = row.shipTo as ShipToObj | null
    if (!s?.name) continue
    const key = [s.name, s.city ?? '', s.state ?? ''].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      key,
      label: [s.name, s.city, s.state].filter(Boolean).join(', '),
    })
  }

  options.sort((a, b) => a.label.localeCompare(b.label))

  return NextResponse.json(options)
}
