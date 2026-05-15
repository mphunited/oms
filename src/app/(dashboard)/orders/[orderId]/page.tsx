import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import OrderEditClient from './order-edit-client'

export default async function OrderDetailPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [dbUser] = await db
    .select({ permissions: users.permissions })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const permissions = (dbUser?.permissions ?? []) as string[]
  if (permissions.includes('RECYCLING_ONLY')) redirect('/orders')

  return <OrderEditClient />
}
