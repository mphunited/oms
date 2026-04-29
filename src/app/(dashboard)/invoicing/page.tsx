import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Suspense } from 'react'
import { InvoicingClient } from '@/components/invoicing/invoicing-client'

export const metadata = { title: 'Invoicing — MPH United' }

export default async function InvoicingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'ACCOUNTING')) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-lg font-semibold">Invoicing</h1>
      <Suspense>
        <InvoicingClient />
      </Suspense>
    </div>
  )
}
