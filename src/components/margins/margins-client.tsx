'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { MarginsTable, type MarginRow } from './margins-table'
import { stripMphPrefix } from '@/lib/utils/strip-mph-prefix'

function getYearBounds() {
  const now = new Date()
  const y = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return { start: `${y}-01-01`, end: `${y}-${mm}-${dd}` }
}

const firstName = (name: string | null | undefined) =>
  name ? name.trim().split(/\s+/)[0] : ''

type SelectOption = { id: string; name: string | null }
type ShipToOption = { key: string; label: string }

const SELECT_CLS =
  'h-9 rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30'

export function MarginsClient({ isSalesRole = false }: { isSalesRole?: boolean }) {
  const { start: defaultStart, end: defaultEnd } = getYearBounds()

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [searchText, setSearchText] = useState('')

  const [customers, setCustomers] = useState<SelectOption[]>([])
  const [vendors, setVendors] = useState<SelectOption[]>([])
  const [salespersons, setSalespersons] = useState<SelectOption[]>([])
  const [shipToOptions, setShipToOptions] = useState<ShipToOption[]>([])

  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [selectedSalespersonId, setSelectedSalespersonId] = useState('')
  const [selectedShipToKey, setSelectedShipToKey] = useState('')

  const [rows, setRows] = useState<MarginRow[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load filter dropdown data once on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
      fetch('/api/margins/salesperson-options').then(r => r.json()),
    ]).then(([c, v, s]) => {
      setCustomers(c)
      setVendors(v)
      setSalespersons(s)
    }).catch(() => {/* non-critical */})
  }, [])

  // When customer changes: reset ship-to, fetch options
  const handleCustomerChange = useCallback(async (customerId: string) => {
    setSelectedCustomerId(customerId)
    setSelectedShipToKey('')
    if (!customerId) {
      setShipToOptions([])
      return
    }
    try {
      const res = await fetch(`/api/margins/ship-to-options?customerId=${customerId}`)
      if (res.ok) setShipToOptions(await res.json())
    } catch {/* non-critical */}
  }, [])

  const runReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setHasRun(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (selectedCustomerId) params.set('customerId', selectedCustomerId)
      if (selectedVendorId) params.set('vendorId', selectedVendorId)
      if (selectedSalespersonId) params.set('salespersonId', selectedSalespersonId)
      if (selectedShipToKey) params.set('shipToKey', selectedShipToKey)
      if (searchText.trim()) params.set('search', searchText.trim())

      const res = await fetch(`/api/margins?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load data')
      setRows(await res.json())
    } catch {
      setError('Failed to load data. Please try again.')
      setRows(null)
    } finally {
      setIsLoading(false)
    }
  }, [startDate, endDate, selectedCustomerId, selectedVendorId, selectedSalespersonId, selectedShipToKey, searchText])

  const handleExport = () => {
    if (!rows || rows.length === 0) return

    const fmt = (v: string | null | undefined) =>
      v != null && v !== '' ? v : ''
    const currency = (v: string | null | undefined) =>
      v != null && v !== '' ? parseFloat(v) : ''
    const pct = (v: string | null | undefined) =>
      v != null && v !== '' ? parseFloat(v) / 100 : ''

    const data = rows.map(row => ({
      'Salesperson':             firstName(row.salesperson),
      'MPH PO':                  fmt(row.orderNumber),
      'Vendor':                  stripMphPrefix(row.vendorName),
      'Customer':                fmt(row.customerName),
      'Ship To':                 fmt(row.shipToLabel),
      'Description':             fmt(row.description),
      'Ship Date':               fmt(row.shipDate),
      'Buy':                     currency(row.buy),
      'Sell':                    currency(row.sell),
      'Qty':                     currency(row.qty),
      'Freight Cost':            currency(row.freightCost),
      'Customer Freight Cost':   currency(row.customerFreightCost),
      'Additional Costs':        currency(row.additionalCosts),
      'Bottle Cost':             currency(row.bottleCost),
      'Bottle Qty':              currency(row.bottleQty),
      'MPH Freight Bottles':     currency(row.mphFreightBottles),
      'Commission':              currency(row.commissionAmount),
      'IBC Total Cost':          currency(row.ibcTotalCost),
      'IBC Total Sell Price':    currency(row.ibcTotalSellPrice),
      'Profit':                  currency(row.profit),
      'Profit %':                pct(row.profitPct),
    }))

    const ws = XLSX.utils.json_to_sheet(data)

    // Format currency columns as accounting format
    const currencyCols = ['H','I','J','K','L','M','N','O','P','Q','R','S','T','U']
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let R = 1; R <= range.e.r; R++) {
      currencyCols.forEach(col => {
        const cell = ws[`${col}${R + 1}`]
        if (cell && typeof cell.v === 'number') {
          cell.z = '"$"#,##0.00'
        }
      })
      // Profit % column (V)
      const pctCell = ws[`V${R + 1}`]
      if (pctCell && typeof pctCell.v === 'number') {
        pctCell.z = '0.0%'
      }
    }

    // Auto column widths
    ws['!cols'] = [
      { wch: 12 }, // Salesperson
      { wch: 14 }, // MPH PO
      { wch: 20 }, // Vendor
      { wch: 24 }, // Customer
      { wch: 26 }, // Ship To
      { wch: 32 }, // Description
      { wch: 11 }, // Ship Date
      { wch: 10 }, // Buy
      { wch: 10 }, // Sell
      { wch: 8  }, // Qty
      { wch: 13 }, // Freight Cost
      { wch: 20 }, // Customer Freight Cost
      { wch: 16 }, // Additional Costs
      { wch: 12 }, // Bottle Cost
      { wch: 10 }, // Bottle Qty
      { wch: 18 }, // MPH Freight Bottles
      { wch: 12 }, // Commission
      { wch: 15 }, // IBC Total Cost
      { wch: 18 }, // IBC Total Sell Price
      { wch: 12 }, // Profit
      { wch: 10 }, // Profit %
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Margins')

    const dateTag = `${startDate ?? 'all'}_${endDate ?? 'all'}`
    XLSX.writeFile(wb, `margins-report-${dateTag}.xlsx`)
  }

  const inputCls = 'h-9 rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30'

  return (
    <div className="p-6 max-w-[1800px]">
      <h1 className="text-2xl font-semibold text-foreground mb-6" style={{ letterSpacing: '-0.96px' }}>
        Margins
      </h1>

      {/* Filter card */}
      <div className="mb-6 rounded-lg border border-[#e5e7eb] bg-card p-4 shadow-sm space-y-3">
        {/* Row 1: Search + Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search customer, MPH PO, vendor..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runReport()}
            className={`${inputCls} w-72`}
          />
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[13px] font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Row 2: Dropdowns + Run */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCustomerId}
            onChange={e => handleCustomerChange(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">All Customers</option>
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

          <select
            value={selectedVendorId}
            onChange={e => setSelectedVendorId(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">All Vendors</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{stripMphPrefix(v.name)}</option>
            ))}
          </select>

          {!isSalesRole && (
            <select
              value={selectedSalespersonId}
              onChange={e => setSelectedSalespersonId(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="">All Salespersons</option>
              {salespersons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={runReport}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-[#1a2744] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#243554] transition-colors disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Run Report
          </button>

          <button
            onClick={handleExport}
            disabled={!rows || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export to Excel
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

      {!isLoading && hasRun && rows !== null && rows.length === 0 && (
        <div className="flex items-center justify-center py-16 text-[13px] text-[#6b7280]">
          No orders found for the selected filters.
        </div>
      )}

      {!isLoading && rows !== null && rows.length > 0 && (
        <>
          <MarginsTable rows={rows} />
          <div className="mt-3">
            <span className="text-[12px] text-[#6b7280]">
              Showing {rows.length} order{rows.length !== 1 ? 's' : ''}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
