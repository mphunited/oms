'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type SelectOption = { id: string; name: string | null }
type ShipToOption = { key: string; label: string }
type SeriesPoint = { month: string; count: number }
type ApiResponse = {
  orderDateSeries: SeriesPoint[]
  shipDateSeries: SeriesPoint[]
  customerName: string
}

const INPUT_CLS =
  'h-9 rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-3 text-[13px] text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30'
const SELECT_CLS =
  'h-9 rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-3 text-[13px] text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30'

function getYearBounds() {
  const now = new Date()
  const y = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return { start: `${y}-01-01`, end: `${y}-${mm}-${dd}` }
}

function fmtMonth(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function fmtDateDisplay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type ChartPoint = { month: string; placed: number; shipped: number }

export function OrderFrequencyClient() {
  const { start: defaultStart, end: defaultEnd } = getYearBounds()

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [customers, setCustomers] = useState<SelectOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [shipToOptions, setShipToOptions] = useState<ShipToOption[]>([])
  const [selectedShipToKey, setSelectedShipToKey] = useState('')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then((c: SelectOption[]) => setCustomers(c))
      .catch(() => {})
  }, [])

  const handleCustomerChange = useCallback(async (customerId: string) => {
    setSelectedCustomerId(customerId)
    setSelectedShipToKey('')
    setShipToOptions([])
    if (!customerId) return
    try {
      const res = await fetch(`/api/margins/ship-to-options?customerId=${customerId}`)
      if (res.ok) setShipToOptions(await res.json())
    } catch {/* non-critical */}
  }, [])

  const runReport = useCallback(async () => {
    if (!selectedCustomerId) return
    setIsLoading(true)
    setError(null)
    setHasRun(true)
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        customerId: selectedCustomerId,
      })
      if (selectedShipToKey) params.set('shipToKey', selectedShipToKey)
      const res = await fetch(`/api/order-frequency?${params}`)
      if (!res.ok) throw new Error('Failed to load data')
      setData(await res.json())
    } catch {
      setError('Failed to load data. Please try again.')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, selectedCustomerId, selectedShipToKey])

  // Build chart data by merging the two series
  const chartData: ChartPoint[] = data
    ? data.orderDateSeries.map((pt, i) => ({
        month: fmtMonth(pt.month),
        placed: pt.count,
        shipped: data.shipDateSeries[i]?.count ?? 0,
      }))
    : []

  const totalPlaced = data
    ? data.orderDateSeries.reduce((s, p) => s + p.count, 0)
    : 0
  const totalShipped = data
    ? data.shipDateSeries.reduce((s, p) => s + p.count, 0)
    : 0

  const allZero = hasRun && data !== null && totalPlaced === 0 && totalShipped === 0

  const selectedShipToLabel =
    shipToOptions.find(o => o.key === selectedShipToKey)?.label ?? null

  const chartTitle = data
    ? selectedShipToLabel
      ? `${data.customerName} — ${selectedShipToLabel}`
      : `${data.customerName} — Order Frequency`
    : ''

  return (
    <div className="p-6 max-w-[1400px]">
      <h1
        className="text-2xl font-semibold text-[#171717] mb-6"
        style={{ letterSpacing: '-0.96px' }}
      >
        Order Frequency
      </h1>

      {/* Filter card */}
      <div className="mb-6 rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm space-y-3">
        {/* Row 1: Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium text-[#4d4d4d]">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium text-[#4d4d4d]">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Row 2: Customer + Ship To + Run */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCustomerId}
            onChange={e => handleCustomerChange(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedShipToKey}
            onChange={e => setSelectedShipToKey(e.target.value)}
            disabled={!selectedCustomerId || shipToOptions.length === 0}
            className={`${SELECT_CLS} disabled:opacity-50`}
          >
            <option value="">All Locations</option>
            {shipToOptions.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={runReport}
            disabled={!selectedCustomerId || isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-[#1a2744] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#243554] transition-colors disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Run Report
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-[13px] text-[#6b7280]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {!isLoading && allZero && (
        <div className="flex items-center justify-center py-16 text-[13px] text-[#6b7280]">
          No orders found for {data ? data.customerName : 'this customer'} in the selected date range.
        </div>
      )}

      {!isLoading && data && !allZero && (
        <div className="space-y-6">
          {/* Chart */}
          <div
            className="rounded-lg bg-white p-5"
            style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px' }}
          >
            <p className="text-[14px] font-semibold text-[#171717] mb-4">{chartTitle}</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Orders', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#6b7280' } }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: 'none',
                    boxShadow: 'rgba(0,0,0,0.12) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 4px 8px',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    value,
                    name === 'placed' ? 'Orders Placed' : 'Orders Shipped',
                  ]}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'placed' ? 'Orders Placed' : 'Orders Shipped'
                  }
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar dataKey="placed" name="placed" fill="#1a2744" radius={[3, 3, 0, 0]} />
                <Bar dataKey="shipped" name="shipped" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-lg bg-white p-4"
              style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px' }}
            >
              <p className="text-[11px] font-medium text-[#6b7280] leading-tight mb-1.5">
                Total Orders Placed
              </p>
              <p className="text-2xl font-semibold text-[#1a2744]">{totalPlaced}</p>
            </div>
            <div
              className="rounded-lg bg-white p-4"
              style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px' }}
            >
              <p className="text-[11px] font-medium text-[#6b7280] leading-tight mb-1.5">
                Total Orders Shipped
              </p>
              <p className="text-2xl font-semibold text-[#1a2744]">{totalShipped}</p>
            </div>
            <div
              className="rounded-lg bg-white p-4"
              style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px' }}
            >
              <p className="text-[11px] font-medium text-[#6b7280] leading-tight mb-1.5">
                Date Range
              </p>
              <p className="text-[13px] font-semibold text-[#1a2744]">
                {fmtDateDisplay(startDate)} – {fmtDateDisplay(endDate)}
              </p>
            </div>
          </div>

          {/* Data table */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a2744]">
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-white/80">Month</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-white/80">Orders Placed</th>
                  <th className="px-3 py-2 text-right text-[11px] font-medium text-white/80">Orders Shipped</th>
                </tr>
              </thead>
              <tbody>
                {data.orderDateSeries.map((pt, i) => (
                  <tr
                    key={pt.month}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td className="px-3 py-2 text-[13px] text-[#171717]">{fmtMonth(pt.month)}</td>
                    <td className="px-3 py-2 text-right text-[13px] text-[#171717] tabular-nums">
                      {pt.count}
                    </td>
                    <td className="px-3 py-2 text-right text-[13px] text-[#171717] tabular-nums">
                      {data.shipDateSeries[i]?.count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
