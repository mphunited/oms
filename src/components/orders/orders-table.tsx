'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, ArrowUp, ArrowDown, ArrowUpDown, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { OrdersFilterBar, DEFAULT_FILTERS, type FilterState } from './orders-filter-bar'
import { OrdersPagination } from './orders-pagination'
import { useOrderEmailActions } from './use-order-email-actions'
import { sendConfirmationEmail } from '@/lib/orders/email-draft-helpers'
import { OrderTableRow, type OrderRow } from './order-row'
import { OrderSummaryDrawer } from './order-summary-drawer'
import { EmailStatusIndicator } from '@/components/orders/email-status-indicator'

const LIMIT = 50

type BadgeMeta = Record<string, { color: string }> | null

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
  const [statusMeta, setStatusMeta] = useState<BadgeMeta>(null)
  const [carrierMeta, setCarrierMeta] = useState<BadgeMeta>(null)
  const [summaryOrderId, setSummaryOrderId] = useState<string | null>(null)
  const [sortBy, setSortBy]   = useState<'ship_date' | 'customer_name' | 'ship_to_name' | 'vendor_name'>('ship_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { emailingPos, emailingBols, handleEmailPosClick, handleEmailBolsClick, emailStatus, emailError } =
    useOrderEmailActions(selectedIds, () => setSelectedIds(new Set()))

  const [emailingConfirmation, setEmailingConfirmation] = useState(false)
  const [grouping, setGrouping] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const filterBarRef = useRef<HTMLDivElement>(null)
  const [filterBarHeight, setFilterBarHeight] = useState(0)

  useEffect(() => {
    if (!filterBarRef.current) return
    const observer = new ResizeObserver(entries => {
      setFilterBarHeight(entries[0].contentRect.height)
    })
    observer.observe(filterBarRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/dropdown-configs?type=ORDER_STATUS').then(r => r.json()),
      fetch('/api/dropdown-configs?type=CARRIER').then(r => r.json()),
    ]).then(([me, statusData, carrierData]: [{ role: string }, { values: string[]; meta: BadgeMeta }, { meta: BadgeMeta }]) => {
      setRole(me?.role ?? null)
      setStatusOptions(Array.isArray(statusData?.values) ? statusData.values : [])
      setStatusMeta(statusData?.meta ?? null)
      setCarrierMeta(carrierData?.meta ?? null)
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
    params.set('sortBy', sortBy)
    params.set('sortDir', sortDir)
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
      filters.salespersonIds, filters.csrIds, page, sortBy, sortDir, refreshTick])

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

  function handleEmailConfirmationClick() {
    void sendConfirmationEmail([...selectedIds], setEmailingConfirmation)
  }

  async function handleGroupClick() {
    const ids = [...selectedIds]
    if (ids.length < 2 || ids.length > 4) {
      toast.error('Select 2–4 orders to group')
      return
    }
    setGrouping(true)
    try {
      const res = await fetch('/api/order-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? `${res.status}`)
      }
      toast.success('Orders grouped as Multi-Ship-To')
      setSelectedIds(new Set())
      setRefreshTick(t => t + 1)
    } catch (err) {
      toast.error('Failed to group: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGrouping(false)
    }
  }

  function handleSortClick(col: typeof sortBy) {
    if (col === sortBy) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
    setPage(1)
  }

  function SortIcon({ col }: { col: typeof sortBy }) {
    if (col !== sortBy) return <ArrowUpDown className="inline ml-1 h-3.5 w-3.5 opacity-50" />
    return sortDir === 'asc'
      ? <ArrowUp className="inline ml-1 h-3.5 w-3.5" />
      : <ArrowDown className="inline ml-1 h-3.5 w-3.5" />
  }

  return (
    <div className="space-y-3">

      <div ref={filterBarRef} className="sticky top-14 z-20 bg-background pb-2 space-y-2">
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
            <button onClick={handleEmailConfirmationClick} disabled={emailingPos || emailingBols || emailingConfirmation}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
              <Mail className="h-3.5 w-3.5" />
              {emailingConfirmation ? 'Creating…' : 'Email Confirmation'}
            </button>
            {(role === 'ADMIN' || role === 'CSR') && selectedIds.size >= 2 && selectedIds.size <= 4 && (
              <button onClick={() => void handleGroupClick()} disabled={grouping}
                className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
                <Link2 className="h-3.5 w-3.5" />
                {grouping ? 'Grouping…' : 'Group as Multi-Ship-To'}
              </button>
            )}
          </div>
        )}
        {emailStatus !== 'idle' && (
          <EmailStatusIndicator status={emailStatus} error={emailError} />
        )}
      </div>

      {loading ? (
        <p className="p-6 text-sm text-muted-foreground">Loading orders…</p>
      ) : error ? (
        <p className="p-6 text-sm text-destructive">Error: {error}</p>
      ) : orderRows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No orders found.</p>
      ) : (
        <>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead
                className="border-b bg-[#00205B] sticky z-10"
                style={{ top: `calc(3.5rem + ${filterBarHeight}px)` }}
              >
                <tr>
                  <th className="w-8 px-2 py-2" aria-label="Expand" />
                  <th className="w-8 px-2 py-2">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-[#00205B] cursor-pointer"
                      aria-label="Select all orders" />
                  </th>
                  <th className="w-8 px-2 py-2" aria-label="Flag" />
                  <th className="px-3 py-2 text-left font-medium text-white">MPH PO</th>
                  <th className="w-[148px] min-w-[148px] max-w-[148px] px-3 py-2 text-left font-medium text-white">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-white">Sales / CSR</th>
                  <th className="px-3 py-2 text-left font-medium text-white cursor-pointer select-none hover:text-[#E5C678] transition-colors" onClick={() => handleSortClick('customer_name')}>Customer<SortIcon col="customer_name" /></th>
                  <th className="px-3 py-2 text-left font-medium text-white">Customer PO</th>
                  <th className="px-3 py-2 text-left font-medium text-white">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-white">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-white cursor-pointer select-none hover:text-[#E5C678] transition-colors" onClick={() => handleSortClick('ship_date')}>Ship Date<SortIcon col="ship_date" /></th>
                  <th className="px-3 py-2 text-left font-medium text-white cursor-pointer select-none hover:text-[#E5C678] transition-colors" onClick={() => handleSortClick('vendor_name')}>Vendor<SortIcon col="vendor_name" /></th>
                  <th className="px-3 py-2 text-right font-medium text-white">Buy</th>
                  <th className="px-3 py-2 text-right font-medium text-white">Sell</th>
                  <th className="px-3 py-2 text-left font-medium text-white cursor-pointer select-none hover:text-[#E5C678] transition-colors" onClick={() => handleSortClick('ship_to_name')}>Ship To<SortIcon col="ship_to_name" /></th>
                  <th className="px-3 py-2 text-left font-medium text-white">Carrier</th>
                  <th className="px-3 py-2 text-left font-medium text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orderRows.map((order, idx) => (
                  <OrderTableRow
                    key={order.id}
                    order={order}
                    rowIndex={idx}
                    expanded={expandedIds.has(order.id)}
                    selected={selectedIds.has(order.id)}
                    role={role}
                    statusOptions={statusOptions}
                    statusMeta={statusMeta}
                    carrierMeta={carrierMeta}
                    onToggleExpand={() => toggleExpand(order.id)}
                    onToggleSelect={() => toggleSelect(order.id)}
                    onToggleFlag={() => toggleFlag(order.id, order.flag)}
                    onPatchStatus={status => patchStatus(order.id, status)}
                    onOpenSummary={setSummaryOrderId}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <OrdersPagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPage={setPage} />
        </>
      )}

      <OrderSummaryDrawer
        orderId={summaryOrderId}
        statusMeta={statusMeta}
        onClose={() => setSummaryOrderId(null)}
      />
    </div>
  )
}
