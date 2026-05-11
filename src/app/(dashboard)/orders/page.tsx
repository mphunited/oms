import { Suspense } from 'react'
import { OrdersTable } from '@/components/orders/orders-table'

export default function OrdersPage() {
  return (
    <div className="p-6">
      <Suspense>
        <OrdersTable />
      </Suspense>
    </div>
  )
}
