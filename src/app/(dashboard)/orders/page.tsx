import { OrdersTable } from '@/components/orders/orders-table'

export default function OrdersPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4">
      <OrdersTable />
    </div>
  )
}
