import { getBadgeTextColor } from '@/lib/orders/badge-colors'
import type { OrderStatus } from '@/types/order'

const statusColors: Record<string, string> = {
  "Pending":                        "bg-slate-100 text-slate-700 border-slate-200",
  "Waiting On Vendor To Confirm":   "bg-amber-50 text-amber-700 border-amber-200",
  "Waiting To Confirm To Customer": "bg-amber-100 text-amber-800 border-amber-300",
  "Confirmed To Customer":          "bg-blue-50 text-blue-700 border-blue-200",
  "Rinse And Return Stage":         "bg-purple-50 text-purple-700 border-purple-200",
  "Sent Order To Carrier":          "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Ready To Ship":                  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Ready To Invoice":               "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Complete":                       "bg-green-100 text-green-800 border-green-300",
  "Canceled":                       "bg-red-100 text-red-700 border-red-200",
}

const invoiceStatusColors: Record<string, string> = {
  "Not Invoiced": "bg-slate-100 text-slate-600 border-slate-200",
  "Invoiced":     "bg-blue-100 text-blue-700 border-blue-200",
  "Paid":         "bg-green-100 text-green-800 border-green-300",
}

export function OrderStatusBadge({ status, color }: { status: OrderStatus | string; color?: string }) {
  if (color) {
    const textColor = getBadgeTextColor(color)
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ backgroundColor: color, color: textColor }}
      >
        {status}
      </span>
    )
  }

  const classes = statusColors[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${classes}`}>
      {status}
    </span>
  )
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const classes = invoiceStatusColors[status] ?? "bg-slate-100 text-slate-600 border-slate-200"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${classes}`}>
      {status}
    </span>
  )
}
