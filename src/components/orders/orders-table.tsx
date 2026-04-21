'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flag, Pencil, Copy } from 'lucide-react'
import { OrderStatusBadge, InvoiceStatusBadge } from '@/components/orders/order-status-badge'
import type { OrderStatus } from '@/types/order'

type SplitLoad = {
  description: string | null
  qty: string | null
  buy: string | null
  sell: string | null
}

type OrderRow = {
  id: string
  order_number: string
  order_date: string | null
  order_type: string | null
  status: string
  customer_po: string | null
  freight_carrier: string | null
  ship_date: string | null
  wanted_date: string | null
  freight_cost: string | null
  freight_to_customer: string | null
  additional_costs: string | null
  flag: boolean
  invoice_payment_status: string
  commission_status: string
  ship_to: { city?: string; state?: string } | null
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  split_loads: SplitLoad[]
}

function formatCurrency(val: string | null | undefined): string {
  const n = parseFloat(val ?? '')
  return isNaN(n) ? '—' : `$${n.toFixed(2)}`
}

function firstDescription(loads: SplitLoad[]): string {
  return loads[0]?.description ?? '—'
}

function totalQty(loads: SplitLoad[]): string {
  const sum = loads.reduce((acc, l) => acc + (parseFloat(l.qty ?? '') || 0), 0)
  return sum > 0 ? sum.toString() : '—'
}

function computeMarginPct(order: OrderRow): number | null {
  const loads = order.split_loads
  if (!loads.length) return null

  const COMMISSION_KEYWORDS = ['New IBC', 'Bottle', 'Rebottle', 'Washout', 'Wash & Return']
  const isEligible = COMMISSION_KEYWORDS.some(kw => (order.order_type ?? '').includes(kw))

  const revenue = loads.reduce((s, l) => s + (parseFloat(l.sell ?? '') || 0) * (parseFloat(l.qty ?? '') || 0), 0)
  const cogs    = loads.reduce((s, l) => s + (parseFloat(l.buy  ?? '') || 0) * (parseFloat(l.qty ?? '') || 0), 0)
  const qty     = loads.reduce((s, l) => s + (parseFloat(l.qty  ?? '') || 0), 0)
  const ftc     = parseFloat(order.freight_to_customer ?? '') || 0
  const fc      = parseFloat(order.freight_cost        ?? '') || 0
  const ac      = parseFloat(order.additional_costs    ?? '') || 0
  const comm    = isEligible ? 3 * qty : 0
  const topLine = revenue + ftc
  if (topLine === 0) return null
  return ((topLine - cogs - fc - ac - comm) / topLine) * 100
}

export function OrdersTable() {
  const [orderRows, setOrderRows] = useState<OrderRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/orders')
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json() as Promise<OrderRow[]>
      })
      .then(data => { setOrderRows(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>
  if (error)   return <p className="p-6 text-sm text-destructive">Error: {error}</p>
  if (!orderRows.length) return <p className="p-6 text-sm text-muted-foreground">No orders found.</p>

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="w-8 px-3 py-2 text-left font-medium text-muted-foreground"></th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">MPH PO</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer PO</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ship Date</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Margin</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Invoice</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orderRows.map(order => {
            const marginPct = computeMarginPct(order)
            const marginLow = marginPct !== null && marginPct < 8
            return (
              <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2">
                  {order.flag && <Flag className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                </td>
                <td className="px-3 py-2 font-mono font-medium">
                  <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </td>
                <td className="px-3 py-2">{order.customer_name ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{order.customer_po ?? '—'}</td>
                <td className="px-3 py-2 max-w-[200px] truncate" title={firstDescription(order.split_loads)}>
                  {firstDescription(order.split_loads)}
                </td>
                <td className="px-3 py-2 text-right">{totalQty(order.split_loads)}</td>
                <td className="px-3 py-2 text-muted-foreground">{order.ship_date ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{order.vendor_name ?? '—'}</td>
                <td className={`px-3 py-2 text-right font-medium tabular-nums ${marginLow ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {marginPct !== null ? `${marginPct.toFixed(1)}%` : '—'}
                </td>
                <td className="px-3 py-2">
                  <InvoiceStatusBadge status={order.invoice_payment_status} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                        href={`/orders/${order.id}?duplicate=1`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Copy className="h-3.5 w-3.5" />
                    </Link>
                </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}