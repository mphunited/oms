import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { DrumRecyclingTable } from '@/components/recycling/drum-recycling-table'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function DrumRecyclingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userRole = 'CSR'
  if (user?.id) {
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
    if (dbUser) userRole = dbUser.role
  }

  return (
    <div>
      <div className="flex items-center justify-between px-6 pt-6">
        <h1 className="text-xl font-semibold text-[#00205B]">Drum Recycling Orders</h1>
        {userRole !== 'SALES' && (
          <Link
            href="/recycling/drums/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#00205B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#B88A44] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Drum Order
          </Link>
        )}
      </div>
      <DrumRecyclingTable initialRows={[]} userRole={userRole} />
    </div>
  )
}
