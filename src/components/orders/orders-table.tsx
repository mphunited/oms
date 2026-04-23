'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Copy, Flag, Mail, Pencil } from 'lucide-react'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import type { OrderStatus } from '@/types/order'
import { formatDate } from '@/lib/utils/format-date'
import { OrdersFilterBar, DEFAULT_FILTERS, type FilterState } from './orders-filter-bar'
import { OrdersPagination } from './orders-pagination'
import { useOrderEmailActions } from './use-order-email-actions'

const LIMIT = 50

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
  const desc = loads[0]?.description ?? '—'
  return desc.length > 40 ? desc.slice(0, 40) + '…' : desc
}

function firstQty(loads: SplitLoad[]): string {
  const val = loads[0]?.qty
  if (!val) return '—'
  const n = parseFloat(val)
  return isNaN(n) ? '—' : String(n)
}

function formatShipTo(shipTo: unknown): string {
  if (!shipTo || typeof shipTo !== 'object') return '—'
  const s = shipTo as { city?: string; state?: string }
  if (!s.city && !s.state) return '—'
  return [s.city, s.state].filter(Boolean).join(', ')
}

export function OrdersTable() {
  const [orderRows, setOrderRows] = useState<OrderRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters]     = useState<FilterState>(DEFAULT_FILTERS)
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { emailingPos, emailingBols, handleEmailPosClick, handleEmailBolsClick } =
    useOrderEmailActions(selectedIds, () => setSelectedIds(new Set()))

  // Debounce search input; also reset page when the debounced value settles
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search)
      setPage(1)
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [filters.search])

  // Fetch whenever any effective filter or page changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch)                    params.set('search', debouncedSearch)
    if (filters.lifecycle !== 'all')        params.set('lifecycle', filters.lifecycle)
    if (filters.statuses.length > 0)        params.set('status', filters.statuses.join(','))
    if (filters.flagOnly)                   params.set('flag', 'true')
    if (filters.vendorIds.length > 0)       params.set('vendor_id', filters.vendorIds.join(','))
    if (filters.customerIds.length > 0)     params.set('customer_id', filters.customerIds.join(','))
    if (filters.shipDateFrom)               params.set('ship_date_from', filters.shipDateFrom)
    if (filters.shipDateTo)                 params.set('ship_date_to', filters.shipDateTo)
    if (filters.invoiceStatuses.length > 0) params.set('invoice_payment_status', filters.invoiceStatuses.join(','))
    if (filters.commissionStatuses.length > 0) params.set('commission_status', filters.commissionStatuses.join(','))
    params.set('page', String(page))
    params.set('limit', String(LIMIT))

    setLoading(true)
    setError(null)
    fetch(`/api/orders?${params}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then(data => {
        setOrderRows(data.orders)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.lifecycle, filters.statuses, filters.flagOnly,
      filters.vendorIds, filters.customerIds, filters.shipDateFrom, filters.shipDateTo,
      filters.invoiceStatuses, filters.commissionStatuses, page])

  function handleFilterChange(update: Partial<FilterState>) {
    setFilters(prev => ({ ...prev, ...update }))
    if (!('search' in update)) setPage(1)
  }

  function handleClearAll() {
    setFilters(DEFAULT_FILTERS)
    setDebouncedSearch('')
    setPage(1)
  }

  async function toggleFlag(id: string, current: boolean) {
    setOrderRows(rows => rows.map(r => r.id === id ? { ...r, flag: !current } : r))
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: !current }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setOrderRows(rows => rows.map(r => r.id === id ? { ...r, flag: current } : r))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = orderRows.length > 0 && orderRows.every(r => selectedIds.has(r.id))

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(orderRows.map(r => r.id)))
  }

  return (
    <div className="space-y-3">
      <OrdersFilterBar filters={filters} onChange={handleFilterChange} onClearAll={handleClearAll} />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <button
            onClick={handleEmailPosClick}
            disabled={emailingPos || emailingBols}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            {emailingPos ? 'Creating…' : 'Email POs'}
          </button>
          <button
            onClick={handleEmailBolsClick}
            disabled={emailingPos || emailingBols}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            {emailingBols ? 'Creating…' : 'Email BOLs'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>
      ) : error ? (
        <p className="p-6 text-sm text-destructive">Error: {error}</p>
      ) : orderRows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No orders found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="w-8 px-2 py-2">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                      aria-label="Select all orders" />
                  </th>
                  <th className="w-8 px-2 py-2" aria-label="Flag" />
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">MPH PO</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Customer PO</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ship Date</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Wanted Date</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendor</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Buy</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sell</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ship To</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Freight</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orderRows.map(order => (
                  <tr key={order.id} className={`hover:bg-muted/30 transition-colors${selectedIds.has(order.id) ? ' bg-muted/20' : ''}`}>
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                        aria-label={`Select order ${order.order_number}`} />
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => toggleFlag(order.id, order.flag)}
                        className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                        aria-label={order.flag ? 'Remove flag' : 'Flag order'}>
                        <Flag className={`h-4 w-4 ${order.flag ? 'text-[#B88A44] fill-[#B88A44]' : 'text-slate-300 hover:text-slate-400'}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono font-medium">
                      <Link href={`/orders/${order.id}`} className="hover:underline text-primary">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2"><OrderStatusBadge status={order.status as OrderStatus} /></td>
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
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(order.freight_cost)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Link href={`/orders/${order.id}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={`/orders/${order.id}?duplicate=1`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <OrdersPagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPage={setPage} />
        </>
      )}
    </div>
  )
}
