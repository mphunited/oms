'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CommissionFiltersBar, type CommissionFilters } from './commission-filters'
import { CommissionTable, type CommissionRow } from './commission-table'

type NamedItem = { id: string; name: string }
type OrderTypeConfig = { id: string; order_type: string; is_commission_eligible: boolean }

const DEFAULT_FILTERS: CommissionFilters = {
  salespersonId: '',
  startDate: '',
  endDate: '',
  commissionStatus: '',
  invoiceStatus: '',
  commissionPaidDateFrom: '',
  commissionPaidDateTo: '',
  search: '',
  customerId: null,
  vendorId: null,
}

export function CommissionClient() {
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CommissionFilters>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [markingPaid, setMarkingPaid] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [salespersons, setSalespersons] = useState<{ id: string; name: string | null }[]>([])
  const [customers, setCustomers] = useState<NamedItem[]>([])
  const [vendors, setVendors] = useState<NamedItem[]>([])
  const [orderTypeConfigs, setOrderTypeConfigs] = useState<OrderTypeConfig[]>([])
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch('/api/users?commission_eligible=true').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch('/api/customers').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch('/api/vendors').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch('/api/order-type-configs').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ]).then(([me, sps, custs, vends, otcs]: [
      { role: string },
      { id: string; name: string | null }[],
      { id: string; name: string }[],
      { id: string; name: string }[],
      OrderTypeConfig[],
    ]) => {
      const userRole = me?.role ?? null
      const userList = Array.isArray(sps) ? sps : []
      setRole(userRole)
      setSalespersons(userList)
      setCustomers(Array.isArray(custs) ? custs : [])
      setVendors(Array.isArray(vends) ? vends : [])
      setOrderTypeConfigs(Array.isArray(otcs) ? otcs : [])
      if (userList.length > 0 && userRole !== 'SALES') {
        setFilters(f => ({ ...f, salespersonId: userList[0].id }))
        setRefreshKey(k => k + 1)
      }
    }).catch(() => { setRole(null); setSalespersons([]) })
  }, [])

  useEffect(() => {
    setSelectedIds(new Set())
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.salespersonId) params.set('salespersonId', filters.salespersonId)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.commissionStatus) params.set('commissionStatus', filters.commissionStatus)
    if (filters.invoiceStatus) params.set('invoiceStatus', filters.invoiceStatus)
    if (filters.search) params.set('search', filters.search)
    if (filters.customerId) params.set('customerId', filters.customerId)
    if (filters.vendorId) params.set('vendorId', filters.vendorId)
    fetch(`/api/commission?${params}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { toast.error('Failed to load commission data'); setLoading(false) })
  }, [filters, refreshKey])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleAll() {
    setSelectedIds(
      selectedIds.size === rows.length
        ? new Set()
        : new Set(rows.map(r => r.load_id))
    )
  }

  function handleRowUpdate(loadId: string, updates: Pick<CommissionRow, 'order_type' | 'commission_status'>) {
    setRows(prev => prev.map(r => r.load_id === loadId ? { ...r, ...updates } : r))
  }

  async function handleMarkPaid() {
    if (!selectedIds.size) return
    setMarkingPaid(true)
    try {
      const res = await fetch('/api/commission/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splitLoadIds: [...selectedIds], commissionPaidDate: paidDate }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Marked ${selectedIds.size} load(s) as Commission Paid`)
      setSelectedIds(new Set())
      setRefreshKey(k => k + 1)
    } catch {
      toast.error('Failed to mark commission paid')
    } finally {
      setMarkingPaid(false)
    }
  }

  const filteredRows = rows
    .filter(r => !filters.commissionPaidDateFrom || (r.commission_paid_date ?? '') >= filters.commissionPaidDateFrom)
    .filter(r => !filters.commissionPaidDateTo || (r.commission_paid_date ?? '') <= filters.commissionPaidDateTo)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold">Commission Report</h1>
        {(role === 'ADMIN' || role === 'ACCOUNTING') && selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="payroll-date" className="text-xs text-muted-foreground">Payroll date:</label>
            <input
              id="payroll-date"
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className="h-8 rounded border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
            />
            <button
              onClick={handleMarkPaid}
              disabled={markingPaid}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              {markingPaid ? 'Marking…' : 'Mark Commission Paid'}
            </button>
          </div>
        )}
      </div>

      <CommissionFiltersBar
        filters={filters}
        salespersons={salespersons}
        customers={customers}
        vendors={vendors}
        role={role}
        onChange={update => setFilters(f => ({ ...f, ...update }))}
      />

      {loading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <CommissionTable
          rows={filteredRows}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onToggleAll={toggleAll}
          role={role}
          orderTypeConfigs={orderTypeConfigs}
          onRowUpdate={handleRowUpdate}
        />
      )}
    </div>
  )
}
