import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function GET() {
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

  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.is_active, true),
        eq(users.role, 'SALES'),
      )
    )
    .orderBy(asc(users.name))

  return NextResponse.json(rows)
}
