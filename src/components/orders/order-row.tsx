'use client'

import { ChevronDown, ChevronRight, Copy, Flag, Pencil } from 'lucide-react'
import Link from 'next/link'
import { OrderStatusBadge } from './order-status-badge'
import type { FullSplitLoad } from './split-load-sub-row'
import { formatDate } from '@/lib/utils/format-date'
import { formatCurrency, firstDescription, firstQty, formatShipTo } from '@/lib/utils/order-table-utils'
import type { OrderStatus } from '@/types/order'

function firstName(full: string | null | undefined): string {
  if (!full) return '—'
  return full.trim().split(' ')[0]
}

export type OrderRow = {
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
  csr_name: string | null
  split_loads: FullSplitLoad[]
}

type Props = {
  order: OrderRow
  expanded: boolean
  selected: boolean
  role: string | null
  statusOptions: string[]
  onToggleExpand: () => void
  onToggleSelect: () => void
  onToggleFlag: () => void
  onPatchStatus: (status: string) => void
  onOpenSummary?: (id: string) => void
}

export function OrderTableRow({
  order, expanded, selected, role, statusOptions,
  onToggleExpand, onToggleSelect, onToggleFlag, onPatchStatus, onOpenSummary,
}: Props) {
  const showLoadLabels = order.split_loads.length > 1

  return (
    <>
      <tr className={`hover:bg-muted/30 transition-colors${selected ? ' bg-muted/20' : ''}`}>
        <td className="px-2 py-2">
          <button type="button" onClick={onToggleExpand}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
            aria-label={expanded ? `Collapse loads for ${order.order_number}` : `Expand loads for ${order.order_number}`}>
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        </td>
        <td className="px-2 py-2">
          <input type="checkbox" checked={selected} onChange={onToggleSelect}
            className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
            aria-label={`Select order ${order.order_number}`} />
        </td>
        <td className="px-2 py-2">
          <button type="button" onClick={onToggleFlag}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
            aria-label={order.flag ? 'Remove flag' : 'Flag order'}>
            <Flag className={`h-4 w-4 ${order.flag ? 'text-[#B88A44] fill-[#B88A44]' : 'text-slate-300 hover:text-slate-400'}`} />
          </button>
        </td>
        <td className="px-3 py-2 font-mono font-medium">
          {onOpenSummary ? (
            <button
              type="button"
              onClick={() => onOpenSummary(order.id)}
              className="hover:underline cursor-pointer text-primary"
            >
              {order.order_number}
            </button>
          ) : (
            <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
              {order.order_number}
            </Link>
          )}
        </td>
        <td className="px-3 py-2">
          {role === 'SALES' ? (
            <OrderStatusBadge status={order.status as OrderStatus} />
          ) : (
            <select value={order.status} onChange={e => onPatchStatus(e.target.value)}
              className="text-xs rounded border border-border bg-background px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#00205B] max-w-[180px]">
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </td>
        <td className="px-3 py-2 text-muted-foreground text-xs">
          {firstName(order.salesperson_name)} / {firstName(order.csr_name)}
        </td>
        <td className="px-3 py-2">{order.customer_name ?? '—'}</td>
        <td className="px-3 py-2 text-muted-foreground">{order.customer_po ?? ''}</td>
        <td className="px-3 py-2 text-muted-foreground" title={order.split_loads[0]?.description ?? ''}>
          {firstDescription(order.split_loads)}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">{firstQty(order.split_loads)}</td>
        <td className="px-3 py-2 text-muted-foreground">{formatDate(order.ship_date)}</td>
        <td className="px-3 py-2 text-muted-foreground">{formatDate(order.wanted_date)}</td>
        <td className="px-3 py-2 text-muted-foreground">{order.vendor_name ?? '—'}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.buy)}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.split_loads[0]?.sell)}</td>
        <td className="px-3 py-2 text-muted-foreground">{formatShipTo(order.ship_to)}</td>
        <td className="px-3 py-2 text-muted-foreground">{order.freight_carrier ?? '—'}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <Link href={`/orders/${order.id}`}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/orders/${order.id}?duplicate=1`}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </Link>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={18} className="px-6 py-3 bg-muted/20">
            {order.split_loads.map((load, index) => (
              <div
                key={load.id}
                className="bg-muted/40 rounded-md p-3 mb-2 last:mb-0 border-l-4 border-[#B88A44]"
              >
                {showLoadLabels && (
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Load {index + 1}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Load PO</span>
                  <span className="font-mono">{load.order_number_override ?? order.order_number}</span>

                  <span className="text-muted-foreground">Order Type</span>
                  <span>{load.order_type ?? '—'}</span>

                  <span className="col-span-2 text-muted-foreground text-xs font-medium">Description</span>
                  <span className="col-span-2 whitespace-pre-wrap">{load.description ?? '—'}</span>

                  <span className="text-muted-foreground">Qty</span>
                  <span>{load.qty ?? '—'}</span>

                  <span className="text-muted-foreground">Buy</span>
                  <span>{formatCurrency(load.buy)}</span>

                  <span className="text-muted-foreground">Sell</span>
                  <span>{formatCurrency(load.sell)}</span>

                  <span className="text-muted-foreground">Ship Date</span>
                  <span>{formatDate(load.ship_date)}</span>

                  <span className="text-muted-foreground">Wanted Date</span>
                  <span>{formatDate(load.wanted_date)}</span>
                </div>
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  )
}
