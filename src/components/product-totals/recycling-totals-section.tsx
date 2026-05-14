'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export type RecyclingVendorRow = {
  vendorId: string | null
  vendorName: string
  totalQty: number
  totalOrders: number
}

export type RecyclingData = {
  ibcTotals: RecyclingVendorRow[]
  drumTotals: RecyclingVendorRow[]
}

type SortKey = 'vendorName' | 'totalQty' | 'totalOrders'
type Dir = 'asc' | 'desc'

function fmtNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function Th({ col, children, sort, dir, onSort }: { col: SortKey; children: string; sort: SortKey; dir: Dir; onSort: (col: SortKey) => void }) {
  return (
    <th
      className="px-3 py-2 text-left text-[11px] font-medium text-white/80 cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sort === col
          ? (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
          : <ChevronUp className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  )
}

function SortedTable({ rows, label }: { rows: RecyclingVendorRow[]; label: string }) {
  const [sort, setSort] = useState<SortKey>('vendorName')
  const [dir, setDir] = useState<Dir>('asc')

  function handleSort(col: SortKey) {
    if (sort === col) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(col); setDir('asc') }
  }

  const sorted = [...rows].sort((a, b) => {
    const mul = dir === 'asc' ? 1 : -1
    if (sort === 'vendorName') return mul * a.vendorName.localeCompare(b.vendorName)
    if (sort === 'totalQty') return mul * (a.totalQty - b.totalQty)
    return mul * (a.totalOrders - b.totalOrders)
  })

  return (
    <div>
      <p className="text-[12px] font-medium text-muted-foreground mb-2">{label}</p>
      <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a2744]">
              <Th col="vendorName" sort={sort} dir={dir} onSort={handleSort}>Vendor</Th>
              <Th col="totalQty" sort={sort} dir={dir} onSort={handleSort}>Total QTY</Th>
              <Th col="totalOrders" sort={sort} dir={dir} onSort={handleSort}>Total orders</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-[#6b7280] text-[13px]">No data in range</td></tr>
            )}
            {sorted.map((r, i) => (
              <tr key={r.vendorId ?? r.vendorName} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/40'} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td className="px-3 py-2 text-[13px] text-foreground">{r.vendorName}</td>
                <td className="px-3 py-2 text-[13px] text-foreground tabular-nums">{fmtNum(r.totalQty)}</td>
                <td className="px-3 py-2 text-[13px] text-foreground tabular-nums">{r.totalOrders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RecyclingTotalsSection({ data }: { data: RecyclingData | null }) {
  const ibc = data?.ibcTotals ?? []
  const drum = data?.drumTotals ?? []

  return (
    <div className="rounded-lg border-l-4 border-[#B88A44] pl-4 py-1">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-[13px] font-semibold text-foreground">Recycling orders</h3>
      </div>
      <p className="text-[12px] text-[#6b7280] mb-4 italic">
        Recycling totals are not included in Product Totals above.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <SortedTable rows={ibc} label="IBC recycling" />
        <SortedTable rows={drum} label="Drum recycling" />
      </div>
    </div>
  )
}
