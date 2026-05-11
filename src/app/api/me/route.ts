import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, title: users.title, phone: users.phone, email_signature: users.email_signature, can_view_commission: users.can_view_commission })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(dbUser)
}
