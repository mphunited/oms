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

  function Th({ col, children }: { col: SortKey; children: string }) {
    return (
      <th
        className="px-3 py-2 text-left text-[11px] font-medium text-white/80 cursor-pointer select-none whitespace-nowrap"
        onClick={() => handleSort(col)}
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

  return (
    <div>
      <p className="text-[12px] font-medium text-[#4d4d4d] mb-2">{label}</p>
      <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a2744]">
              <Th col="vendorName">Vendor</Th>
              <Th col="totalQty">Total QTY</Th>
              <Th col="totalOrders">Total orders</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-[#6b7280] text-[13px]">No data in range</td></tr>
            )}
            {sorted.map((r, i) => (
              <tr key={r.vendorId ?? r.vendorName} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td className="px-3 py-2 text-[13px] text-[#171717]">{r.vendorName}</td>
                <td className="px-3 py-2 text-[13px] text-[#171717] tabular-nums">{fmtNum(r.totalQty)}</td>
                <td className="px-3 py-2 text-[13px] text-[#171717] tabular-nums">{r.totalOrders}</td>
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
        <h3 className="text-[13px] font-semibold text-[#171717]">Recycling orders</h3>
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
