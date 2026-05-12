import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { OrderFrequencyClient } from '@/components/order-frequency/order-frequency-client'

export const metadata = { title: 'Order Frequency — MPH United' }

export default async function OrderFrequencyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser) redirect('/dashboard')

  if (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING') {
    redirect('/dashboard')
  }

  return <OrderFrequencyClient />
}
