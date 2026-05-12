import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ProductTotalsClient } from '@/components/product-totals/product-totals-client'

export const metadata = { title: 'Product Totals — MPH United' }

export default async function ProductTotalsPage() {
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

  return <ProductTotalsClient />
}
