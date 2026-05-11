'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { ProductTotal } from './aggregate-cards'

export type VendorTotal = {
  vendorId: string | null
  vendorName: string
  orderType: string
  totalQty: number
  totalShipments: number
}

type SortKey = 'orderType' | 'totalQty' | 'totalShipments'
type VendorSortKey = 'vendorName' | 'orderType' | 'totalQty' | 'totalShipments'
type Dir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: Dir }) {
  if (!active) return <ChevronUp className="h-3 w-3 opacity-30" />
  return dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
}

function fmtNum(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

function Th({ label, col, sort, dir, onSort }: { label: string; col: string; sort: string; dir: Dir; onSort: (c: string) => void }) {
  return (
    <th
      className="px-3 py-2 text-left text-[11px] font-medium text-white/80 cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={sort === col} dir={dir} />
      </span>
    </th>
  )
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
      <h3 className="text-[13px] font-semibold text-[#171717]">{children}</h3>
    </div>
  )
}

export function ProductTotalsSection({
  productTotals,
  vendorTotals,
}: {
  productTotals: ProductTotal[]
  vendorTotals: VendorTotal[]
}) {
  const [pSort, setPSort] = useState<SortKey>('orderType')
  const [pDir, setPDir] = useState<Dir>('asc')
  const [vSort, setVSort] = useState<VendorSortKey>('vendorName')
  const [vDir, setVDir] = useState<Dir>('asc')

  function handleProductSort(col: string) {
    if (pSort === col) setPDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setPSort(col as SortKey); setPDir('asc') }
  }
  function handleVendorSort(col: string) {
    if (vSort === col) setVDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setVSort(col as VendorSortKey); setVDir('asc') }
  }

  const sortedProducts = [...productTotals].sort((a, b) => {
    const mul = pDir === 'asc' ? 1 : -1
    if (pSort === 'orderType') return mul * a.orderType.localeCompare(b.orderType)
    if (pSort === 'totalQty') return mul * (a.totalQty - b.totalQty)
    return mul * (a.totalShipments - b.totalShipments)
  })

  const sortedVendors = [...vendorTotals].sort((a, b) => {
    const mul = vDir === 'asc' ? 1 : -1
    if (vSort === 'vendorName') return mul * a.vendorName.localeCompare(b.vendorName)
    if (vSort === 'orderType') return mul * a.orderType.localeCompare(b.orderType)
    if (vSort === 'totalQty') return mul * (a.totalQty - b.totalQty)
    return mul * (a.totalShipments - b.totalShipments)
  })

  const thCls = 'bg-[#1a2744]'

  return (
    <div>
      <SectionHeader>Product totals</SectionHeader>
      <div className="grid grid-cols-2 gap-6">
        {/* Left: by product */}
        <div>
          <p className="text-[12px] font-medium text-[#4d4d4d] mb-2">By product</p>
          <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className={thCls}>
                  <Th label="Product" col="orderType" sort={pSort} dir={pDir} onSort={handleProductSort} />
                  <Th label="Total QTY" col="totalQty" sort={pSort} dir={pDir} onSort={handleProductSort} />
                  <Th label="Total shipments" col="totalShipments" sort={pSort} dir={pDir} onSort={handleProductSort} />
                </tr>
              </thead>
              <tbody>
                {sortedProducts.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-[#6b7280] text-[13px]">No data in range</td></tr>
                )}
                {sortedProducts.map((r, i) => (
                  <tr key={r.orderType} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-3 py-2 text-[13px] text-[#171717]">{r.orderType}</td>
                    <td className="px-3 py-2 text-[13px] text-[#171717] tabular-nums">{fmtNum(r.totalQty)}</td>
                    <td className="px-3 py-2 text-[13px] text-[#171717] tabular-nums">{r.totalShipments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: by vendor + product */}
        <div>
          <p className="text-[12px] font-medium text-[#4d4d4d] mb-2">By vendor and product</p>
          <div className="rounded-lg overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className={thCls}>
                  <Th label="Vendor" col="vendorName" sort={vSort} dir={vDir} onSort={handleVendorSort} />
                  <Th label="Product" col="orderType" sort={vSort} dir={vDir} onSort={handleVendorSort} />
                  <Th label="Total QTY" col="totalQty" sort={vSort} dir={vDir} onSort={handleVendorSort} />
                  <Th label="Shipments" col="totalShipments" sort={vSort} dir={vDir} onSort={handleVendorSort} />
                </tr>
              </thead>
              <tbody>
                {sortedVendors.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-[#6b7280] text-[13px]">No data in range</td></tr>
                )}
                {sortedVendors.map((r, i) => (
                  <tr key={`${r.vendorId}-${r.orderType}`} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-3 py-2 text-[13px] text-[#171717]">{r.vendorName}</td>
                    <td className="px-3 py-2 text-[13px] text-[#171717]">{r.orderType}</td>
                    <td className="px-3 py-2 text-[13px] text-[#171717] tabular-nums">{fmtNum(r.totalQty)}</td>
                    <td className="px-3 py-2 text-[13px] text-[#171717] tabular-nums">{r.totalShipments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
