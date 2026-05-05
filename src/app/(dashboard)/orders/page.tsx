import { OrdersTable } from '@/components/orders/orders-table'

export default function OrdersPage() {
  return (
    <div className="flex flex-col h-full p-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <OrdersTable />
    </div>
  )
}