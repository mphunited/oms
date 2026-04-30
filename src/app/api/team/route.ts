import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [me] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!me || me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      title: users.title,
      phone: users.phone,
      role: users.role,
      is_active: users.is_active,
      email_signature: users.email_signature,
      can_view_commission: users.can_view_commission,
      is_commission_eligible: users.is_commission_eligible,
      permissions: users.permissions,
    })
    .from(users)
    .orderBy(users.name)

  return NextResponse.json(members)
}
