'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { AggregateCards, type ProductTotal } from './aggregate-cards'
import { ProductTotalsSection, type VendorTotal } from './product-totals-section'
import { RecyclingTotalsSection, type RecyclingData } from './recycling-totals-section'

function getYearBounds() {
  const y = new Date().getFullYear()
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

type ProductResponse = { productTotals: ProductTotal[]; vendorTotals: VendorTotal[] }

function SectionDivider() {
  return <hr className="border-t border-[#f3f4f6] my-8" />
}

export function ProductTotalsClient() {
  const { start: defaultStart, end: defaultEnd } = getYearBounds()
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [productData, setProductData] = useState<ProductResponse | null>(null)
  const [recyclingData, setRecyclingData] = useState<RecyclingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMain = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = `startDate=${startDate}&endDate=${endDate}`
      const [pRes, rRes] = await Promise.all([
        fetch(`/api/product-totals/product-totals?${qs}`),
        fetch(`/api/product-totals/recycling-totals?${qs}`),
      ])
      if (!pRes.ok || !rRes.ok) throw new Error('Failed to load data')
      const [pJson, rJson] = await Promise.all([pRes.json(), rRes.json()])
      setProductData(pJson)
      setRecyclingData(rJson)
    } catch {
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { fetchMain() }, [fetchMain])

  async function handleExportPdf() {
    setPdfLoading(true)
    try {
      const qs = `startDate=${startDate}&endDate=${endDate}`
      const res = await fetch(`/api/product-totals/pdf?${qs}`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `product-totals-${startDate}-${endDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-[1280px]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#171717]" style={{ letterSpacing: '-0.96px' }}>
          Product Totals
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium text-[#4d4d4d]">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="rounded-md px-3 py-1.5 text-[13px] text-[#171717] bg-white"
              style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.08)' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium text-[#4d4d4d]">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-md px-3 py-1.5 text-[13px] text-[#171717] bg-white"
              style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.08)' }}
            />
          </div>
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-md bg-[#1a2744] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#243554] transition-colors disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-[#6b7280] mb-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {/* Section 1 — Product Totals */}
      <AggregateCards productTotals={productData?.productTotals ?? []} />
      <ProductTotalsSection
        productTotals={productData?.productTotals ?? []}
        vendorTotals={productData?.vendorTotals ?? []}
      />

      <SectionDivider />

      {/* Section 2 — Recycling Totals */}
      <RecyclingTotalsSection data={recyclingData} />
    </div>
  )
}
