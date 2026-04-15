import { NewOrderForm } from '@/components/orders/new-order-form'

export default function NewOrderPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">New Order</h1>
      <NewOrderForm />
    </div>
  )
}