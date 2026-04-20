export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { CustomerDetail, type CustomerData } from '@/components/customers/customer-detail'

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  })
  if (!customer) notFound()

  return (
    <div className="space-y-4">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Customers
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
      </div>
      <CustomerDetail customer={customer as CustomerData} />
    </div>
  )
}
