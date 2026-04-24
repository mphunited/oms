'use client'

// src/components/commission/commission-client.tsx
// Commission report orchestrator — fetches data, manages state, renders filters + table.

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CommissionFiltersBar, type CommissionFilters } from './commission-filters'
import { CommissionTable, type CommissionRow } from './commission-table'

const DEFAULT_FILTERS: CommissionFilters = { salespersonId: '', startDate: '', endDate: '' }

export function CommissionClient() {
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<CommissionFilters>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [markingPaid, setMarkingPaid] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [salespersons, setSalespersons] = useState<{ id: string; name: string | null }[]>([])
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/users?permission=SALES').then(r => r.json()),
    ]).then(([me, sps]: [{ role: string }, { id: string; name: string | null }[]]) => {
      setRole(me?.role ?? null)
      setSalespersons(Array.isArray(sps) ? sps : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.salespersonId) params.set('salespersonId', filters.salespersonId)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    setLoading(true)
    fetch(`/api/commission?${params}`)
      .then(r => r.json())
      .then(data => { setRows(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filters])

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
      setFilters(f => ({ ...f })) // trigger refetch
    } catch {
      toast.error('Failed to mark commission paid')
    } finally {
      setMarkingPaid(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold">Commission Report</h1>
        {(role === 'ADMIN' || role === 'ACCOUNTING') && selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Payroll date:</label>
            <input
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
        role={role}
        onChange={update => setFilters(f => ({ ...f, ...update }))}
      />

      {loading ? (
        <p className="py-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <CommissionTable
          rows={rows}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onToggleAll={toggleAll}
          role={role}
        />
      )}
    </div>
  )
}
