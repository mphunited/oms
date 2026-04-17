import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { CustomerList } from '@/components/customers/customer-list'

export default async function CustomersPage() {
  const rows = await db
    .select()
    .from(customers)
    .orderBy(asc(customers.name))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {rows.length} customer{rows.length !== 1 ? 's' : ''}
        </p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <CustomerList initialCustomers={rows as any} />
    </div>
  )
}
