'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronUp, ChevronDown } from 'lucide-react'

type Customer = { id: string; name: string }
type PeriodData = { period: string; count: number }
type CustomerRow = { customerId: string; customerName: string; total: number; periodCounts: Record<string, number> }

function fmtPeriod(p: string): string {
  if (!p) return ''
  const d = new Date(p + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
      <h3 className="text-[13px] font-semibold text-[#171717]">{children}</h3>
    </div>
  )
}

function GranularityToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-md overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
      {['monthly', 'quarterly'].map(g => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${value === g ? 'bg-[#1a2744] text-white' : 'bg-white text-[#374151] hover:bg-[#f9fafb]'}`}
        >
          {g === 'monthly' ? 'Monthly' : 'Quarterly'}
        </button>
      ))}
    </div>
  )
}

export function CustomerFrequencySection({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [tab, setTab] = useState<'single' | 'all'>('single')
  const [granularity, setGranularity] = useState('monthly')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [singleData, setSingleData] = useState<PeriodData[]>([])
  const [allData, setAllData] = useState<{ periods: string[]; customers: CustomerRow[] }>({ periods: [], customers: [] })
  const [loading, setLoading] = useState(false)
  const [sortCol, setSortCol] = useState('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Fetch customer list once
  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then((data: Customer[]) => setCustomers(data))
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const base = `/api/financials/customer-orders?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`
      if (tab === 'single' && selectedCustomer) {
        const res = await fetch(`${base}&customerId=${selectedCustomer}`)
        const json = await res.json()
        setSingleData(json.data ?? [])
      } else if (tab === 'all') {
        const res = await fetch(base)
        const json = await res.json()
        setAllData({ periods: json.periods ?? [], customers: json.customers ?? [] })
      }
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, granularity, tab, selectedCustomer])

  useEffect(() => { fetchData() }, [fetchData])

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('desc') }
  }

  const sortedAll = [...allData.customers].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'customerName') return mul * a.customerName.localeCompare(b.customerName)
    if (sortCol === 'total') return mul * (a.total - b.total)
    return mul * ((a.periodCounts[sortCol] ?? 0) - (b.periodCounts[sortCol] ?? 0))
  })

  const chartData = singleData.map(d => ({ name: fmtPeriod(d.period), count: d.count }))

  return (
    <div>
      <SectionHeader>Customer order frequency</SectionHeader>

      {/* Tab + granularity */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['single', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-[5px] text-[13px] font-medium rounded-full transition-colors ${
                tab === t ? 'bg-[#1a2744] text-white' : 'bg-white text-[#374151]'
              }`}
              style={tab !== t ? { boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.08)' } : {}}
            >
              {t === 'single' ? 'By customer' : 'All customers'}
            </button>
          ))}
        </div>
        <GranularityToggle value={granularity} onChange={setGranularity} />
      </div>

      {tab === 'single' && (
        <div className="space-y-4">
          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            className="rounded-md px-3 py-2 text-[13px] text-[#171717] bg-white w-72"
            style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.08)' }}
          >
            <option value="">— Select a customer —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {selectedCustomer && chartData.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: 'none', boxShadow: 'rgba(0,0,0,0.12) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 4px 8px' }}
                    formatter={(v) => [v, 'Orders']}
                  />
                  <Bar dataKey="count" fill="#00205B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {selectedCustomer && (
            <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1a2744]">
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-white/80">Period</th>
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-white/80">Order count</th>
                  </tr>
                </thead>
                <tbody>
                  {singleData.length === 0 && !loading && (
                    <tr><td colSpan={2} className="px-3 py-6 text-center text-[#6b7280] text-[13px]">No orders in range</td></tr>
                  )}
                  {singleData.map((d, i) => (
                    <tr key={d.period} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="px-3 py-2 text-[13px] text-[#171717]">{fmtPeriod(d.period)}</td>
                      <td className="px-3 py-2 text-[13px] text-[#171717] tabular-nums">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'all' && (
        <div className="rounded-lg overflow-auto" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a2744]">
                {[{ label: 'Customer', col: 'customerName' }, { label: 'Total orders', col: 'total' }].map(h => (
                  <th key={h.col} onClick={() => handleSort(h.col)} className="px-3 py-2 text-left text-[11px] font-medium text-white/80 cursor-pointer whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {h.label}
                      {sortCol === h.col ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronUp className="h-3 w-3 opacity-30" />}
                    </span>
                  </th>
                ))}
                {allData.periods.map(p => (
                  <th key={p} onClick={() => handleSort(p)} className="px-3 py-2 text-right text-[11px] font-medium text-white/80 cursor-pointer whitespace-nowrap">
                    <span className="inline-flex items-center justify-end gap-1">
                      {fmtPeriod(p)}
                      {sortCol === p ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronUp className="h-3 w-3 opacity-30" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAll.length === 0 && !loading && (
                <tr><td colSpan={2 + allData.periods.length} className="px-3 py-6 text-center text-[#6b7280] text-[13px]">No data in range</td></tr>
              )}
              {sortedAll.map((c, i) => (
                <tr key={c.customerId} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="px-3 py-2 text-[13px] text-[#171717]">{c.customerName}</td>
                  <td className="px-3 py-2 text-[13px] font-medium text-[#171717] tabular-nums">{c.total}</td>
                  {allData.periods.map(p => (
                    <td key={p} className="px-3 py-2 text-right text-[13px] text-[#6b7280] tabular-nums">{c.periodCounts[p] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
