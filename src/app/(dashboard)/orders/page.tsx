import Link from 'next/link'
import { Plus } from 'lucide-react'
import { OrdersTable } from '@/components/orders/orders-table'

export default function OrdersPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Link>
      </div>
      <OrdersTable />
    </div>
  )
}