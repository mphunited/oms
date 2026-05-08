'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, Pencil, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/format-date'
import { RecyclingOrderDrawer } from '@/components/recycling/recycling-order-drawer'
import { RECYCLING_STATUSES } from '@/lib/db/schema'

type Row = {
  id: string
  order_number: string
  status: string
  salesperson_name: string | null
  csr_name: string | null
  customer_name: string | null
  vendor_name: string | null
  customer_po: string | null
  description: string | null
  qty: string | null
  pick_up_date: string | null
  ship_from: unknown
  freight_carrier: string | null
  buy: string | null
  sell: string | null
  flag: boolean
}

type Props = {
  initialRows: Row[]
  userRole: string
}

export function DrumRecyclingTable({ initialRows, userRole }: Props) {
  const router = useRouter()
  const [rows, setRows]           = useState<Row[]>(initialRows)
  const [search, setSearch]       = useState('')
  const [lifecycle, setLifecycle] = useState<'Active' | 'Complete' | 'All'>('Active')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [drawerId, setDrawerId]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ type: 'Drum', lifecycle })
    if (search)              p.set('search', search)
    if (statusFilter.length) p.set('status', statusFilter.join(','))
    try {
      const res = await fetch(`/api/recycling-orders?${p}`)
      const data = await res.json()
      setRows(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [search, lifecycle, statusFilter])

  useEffect(() => { fetchRows() }, [fetchRows])

  async function toggleFlag(id: string, current: boolean) {
    setRows(r => r.map(o => o.id === id ? { ...o, flag: !current } : o))
    const res = await fetch(`/api/recycling-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag: !current }),
    })
    if (!res.ok) {
      setRows(r => r.map(o => o.id === id ? { ...o, flag: current } : o))
      toast.error('Failed to update flag')
    }
  }

  async function patchStatus(id: string, status: string) {
    const res = await fetch(`/api/recycling-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setRows(r => r.map(o => o.id === id ? { ...o, status } : o))
    else toast.error('Failed to update status')
  }

  function clearFilters() {
    setSearch(''); setLifecycle('Active'); setStatusFilter([])
  }

  type AddrJson = { name?: string; city?: string; state?: string }

  function shipFromCell(raw: unknown) {
    if (!raw) return '—'
    const a = raw as AddrJson
    const city = [a.city, a.state].filter(Boolean).join(', ')
    return (
      <div>
        {a.name && <p className="text-xs font-medium">{a.name}</p>}
        {city && <p className="text-xs text-muted-foreground">{city}</p>}
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Filter bar */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search order, customer, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-64"
          />
          {(['Active', 'Complete', 'All'] as const).map(lc => (
            <button
              key={lc}
              onClick={() => setLifecycle(lc)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                lifecycle === lc
                  ? 'bg-[#00205B] text-white border-[#00205B]'
                  : 'border-border text-muted-foreground hover:border-[#00205B]'
              }`}
            >
              {lc}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
            Clear Filters
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            multiple
            value={statusFilter}
            onChange={e => setStatusFilter(Array.from(e.target.selectedOptions, o => o.value))}
            className="h-8 rounded border border-border bg-background text-xs px-2"
          >
            {RECYCLING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-[#00205B] text-white">
            <tr>
              {['Flag','MPH PO','Status','Sales/CSR','Customer','Customer PO',
                'Description','Qty','Ship Date','Vendor','Buy','Sell',
                'Ship From','Freight','Actions'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={15} className="text-center py-8 text-muted-foreground text-xs">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={15} className="text-center py-8 text-muted-foreground text-xs">No orders found</td></tr>
            )}
            {!loading && rows.map(row => (
              <tr
                key={row.id}
                className={`group border-b transition-colors hover:bg-muted/40 ${row.flag ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
              >
                <td className="px-3 py-2">
                  <button onClick={() => toggleFlag(row.id, row.flag)}>
                    {row.flag
                      ? <Flag className="h-4 w-4 text-red-500 fill-red-500" />
                      : <Flag className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setDrawerId(row.id)}
                    className="font-mono text-xs text-[#00205B] hover:underline font-semibold"
                  >
                    {row.order_number}
                  </button>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {userRole === 'SALES' ? (
                    <Badge variant="secondary" className="text-xs">{row.status}</Badge>
                  ) : (
                    <select
                      value={row.status}
                      onChange={e => patchStatus(row.id, e.target.value)}
                      className="rounded border border-border bg-background text-xs px-1 py-0.5"
                    >
                      {RECYCLING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {[row.salesperson_name, row.csr_name].filter(Boolean).map(n => n!.split(' ')[0]).join(' / ') || '—'}
                </td>
                <td className="px-3 py-2 text-xs">{row.customer_name || '—'}</td>
                <td className="px-3 py-2 text-xs">{row.customer_po || '—'}</td>
                <td className="px-3 py-2 text-xs max-w-[160px] truncate">{row.description || '—'}</td>
                <td className="px-3 py-2 text-xs">{row.qty || '—'}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(row.pick_up_date)}</td>
                <td className="px-3 py-2 text-xs">{row.vendor_name || '—'}</td>
                <td className="px-3 py-2 text-xs">{row.buy ? `$${parseFloat(row.buy).toFixed(2)}` : '—'}</td>
                <td className="px-3 py-2 text-xs">{row.sell ? `$${parseFloat(row.sell).toFixed(2)}` : '—'}</td>
                <td className="px-3 py-2 text-xs">{shipFromCell(row.ship_from)}</td>
                <td className="px-3 py-2 text-xs">{row.freight_carrier || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/recycling/drums/${row.id}`)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                    <button onClick={() => router.push(`/recycling/drums/new?duplicate=${row.id}`)}>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecyclingOrderDrawer
        orderId={drawerId}
        editHref={drawerId ? `/recycling/drums/${drawerId}` : '#'}
        onClose={() => setDrawerId(null)}
      />
    </div>
  )
}
