'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { OrdersFilterBar, DEFAULT_FILTERS, type FilterState } from './orders-filter-bar'
import { OrdersPagination } from './orders-pagination'
import { useOrderEmailActions } from './use-order-email-actions'
import { OrderTableRow, type OrderRow } from './order-row'

const LIMIT = 50

export function OrdersTable() {
  const [orderRows, setOrderRows] = useState<OrderRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters]     = useState<FilterState>(DEFAULT_FILTERS)
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [role, setRole]           = useState<string | null>(null)
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { emailingPos, emailingBols, handleEmailPosClick, handleEmailBolsClick } =
    useOrderEmailActions(selectedIds, () => setSelectedIds(new Set()))

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/dropdown-configs?type=ORDER_STATUS').then(r => r.json()),
    ]).then(([me, statuses]: [{ role: string }, string[]]) => {
      setRole(me?.role ?? null)
      setStatusOptions(Array.isArray(statuses) ? statuses : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search)
      setPage(1)
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [filters.search])

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
    if (filters.salespersonIds.length > 0) params.set('salesperson_id', filters.salespersonIds.join(','))
    if (filters.csrIds.length > 0)         params.set('csr_id', filters.csrIds.join(','))
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
      filters.salespersonIds, filters.csrIds, page])

  function handleFilterChange(update: Partial<FilterState>) {
    setFilters(prev => ({ ...prev, ...update }))
    if (!('search' in update)) setPage(1)
    setExpandedIds(new Set())
  }

  function handleClearAll() {
    setFilters(DEFAULT_FILTERS)
    setDebouncedSearch('')
    setPage(1)
    setExpandedIds(new Set())
  }

  function toggleExpand(id: string) {
    setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
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

  async function patchStatus(id: string, newStatus: string) {
    const prev = orderRows.find(r => r.id === id)?.status
    setOrderRows(rows => rows.map(r => r.id === id ? { ...r, status: newStatus } : r))
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => null)
    if (!res?.ok) {
      if (prev !== undefined) setOrderRows(rows => rows.map(r => r.id === id ? { ...r, status: prev } : r))
      toast.error('Failed to update status')
    } else { toast.success('Status updated') }
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
          <button onClick={handleEmailPosClick} disabled={emailingPos || emailingBols}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" />
            {emailingPos ? 'Creating…' : 'Email POs'}
          </button>
          <button onClick={handleEmailBolsClick} disabled={emailingPos || emailingBols}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
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
                  <th className="w-8 px-2 py-2" aria-label="Expand" />
                  <th className="w-8 px-2 py-2">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                      aria-label="Select all orders" />
                  </th>
                  <th className="w-8 px-2 py-2" aria-label="Flag" />
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">MPH PO</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Sales / CSR</th>
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
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Carrier</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orderRows.map(order => (
                  <OrderTableRow
                    key={order.id}
                    order={order}
                    expanded={expandedIds.has(order.id)}
                    selected={selectedIds.has(order.id)}
                    role={role}
                    statusOptions={statusOptions}
                    onToggleExpand={() => toggleExpand(order.id)}
                    onToggleSelect={() => toggleSelect(order.id)}
                    onToggleFlag={() => toggleFlag(order.id, order.flag)}
                    onPatchStatus={status => patchStatus(order.id, status)}
                  />
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
