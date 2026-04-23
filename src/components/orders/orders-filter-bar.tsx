'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Flag, Search, X } from 'lucide-react'
import { FilterMultiSelect } from './filter-multi-select'

export type FilterState = {
  search: string
  lifecycle: 'active' | 'complete' | 'cancelled' | 'all'
  statuses: string[]
  flagOnly: boolean
  vendorIds: string[]
  customerIds: string[]
  shipDateFrom: string
  shipDateTo: string
  invoiceStatuses: string[]
  commissionStatuses: string[]
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  lifecycle: 'active',
  statuses: [],
  flagOnly: false,
  vendorIds: [],
  customerIds: [],
  shipDateFrom: '',
  shipDateTo: '',
  invoiceStatuses: [],
  commissionStatuses: [],
}

type NamedItem = { id: string; name: string }

type Props = {
  filters: FilterState
  onChange: (update: Partial<FilterState>) => void
  onClearAll: () => void
}

const LIFECYCLE_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'complete',  label: 'Complete' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all',       label: 'All' },
] as const

const STATUS_OPTIONS = [
  'Pending', 'Waiting On Vendor To Confirm', 'Waiting To Confirm To Customer',
  'Confirmed To Customer', 'Rinse And Return Stage', 'Sent Order To Carrier',
  'Ready To Ship', 'Ready To Invoice', 'Complete', 'Cancelled',
].map(s => ({ value: s, label: s }))

const INVOICE_OPTIONS = ['Not Invoiced', 'Invoiced', 'Paid'].map(s => ({ value: s, label: s }))
const COMMISSION_OPTIONS = ['Eligible', 'Not Eligible', 'Commission Paid'].map(s => ({ value: s, label: s }))

export function OrdersFilterBar({ filters, onChange, onClearAll }: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [vendors, setVendors] = useState<NamedItem[]>([])
  const [customers, setCustomers] = useState<NamedItem[]>([])

  useEffect(() => {
    fetch('/api/vendors')
      .then(r => r.json())
      .then((d: NamedItem[]) => setVendors(d.map(v => ({ id: v.id, name: v.name }))))
      .catch(() => {})
    fetch('/api/customers')
      .then(r => r.json())
      .then((d: NamedItem[]) => setCustomers(d.map(c => ({ id: c.id, name: c.name }))))
      .catch(() => {})
  }, [])

  const moreActiveCount = [
    filters.vendorIds.length > 0,
    filters.customerIds.length > 0,
    !!filters.shipDateFrom,
    !!filters.shipDateTo,
    filters.invoiceStatuses.length > 0,
    filters.commissionStatuses.length > 0,
  ].filter(Boolean).length

  const hasAnyFilter =
    !!filters.search ||
    filters.lifecycle !== 'active' ||
    filters.statuses.length > 0 ||
    filters.flagOnly ||
    moreActiveCount > 0

  return (
    <div className="space-y-2 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
            placeholder="Search orders, customers, vendors, PO#..."
            className="h-8 w-72 rounded-md border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#00205B]"
          />
        </div>

        {/* Lifecycle toggle */}
        <div className="flex overflow-hidden rounded-md border">
          {LIFECYCLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ lifecycle: opt.value })}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.lifecycle === opt.value
                  ? 'bg-[#00205B] text-white'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <FilterMultiSelect
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.statuses}
          onChange={v => onChange({ statuses: v })}
        />

        {/* Flag toggle */}
        <button
          type="button"
          onClick={() => onChange({ flagOnly: !filters.flagOnly })}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            filters.flagOnly
              ? 'border-[#B88A44] bg-[#B88A44] text-white'
              : 'border-border bg-background text-foreground hover:bg-muted'
          }`}
        >
          <Flag className={`h-3.5 w-3.5 ${filters.flagOnly ? 'fill-white' : ''}`} />
          Flagged Only
        </button>

        {/* More filters */}
        <button
          type="button"
          onClick={() => setMoreOpen(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            moreActiveCount > 0
              ? 'border-[#00205B] bg-[#00205B] text-white'
              : 'border-border bg-background text-foreground hover:bg-muted'
          }`}
        >
          More Filters
          {moreActiveCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#00205B]">
              {moreActiveCount}
            </span>
          )}
          {moreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {/* Clear all */}
        {hasAnyFilter && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* More Filters panel */}
      {moreOpen && (
        <div className="flex flex-wrap items-end gap-3 border-t pt-3">
          <FilterMultiSelect
            label="Vendor"
            options={vendors.map(v => ({ value: v.id, label: v.name }))}
            selected={filters.vendorIds}
            onChange={v => onChange({ vendorIds: v })}
          />
          <FilterMultiSelect
            label="Customer"
            options={customers.map(c => ({ value: c.id, label: c.name }))}
            selected={filters.customerIds}
            onChange={v => onChange({ customerIds: v })}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Ship date</span>
            <input
              type="date"
              value={filters.shipDateFrom}
              onChange={e => onChange({ shipDateFrom: e.target.value })}
              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.shipDateTo}
              onChange={e => onChange({ shipDateTo: e.target.value })}
              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
            />
          </div>
          <FilterMultiSelect
            label="Invoice Status"
            options={INVOICE_OPTIONS}
            selected={filters.invoiceStatuses}
            onChange={v => onChange({ invoiceStatuses: v })}
          />
          <FilterMultiSelect
            label="Commission"
            options={COMMISSION_OPTIONS}
            selected={filters.commissionStatuses}
            onChange={v => onChange({ commissionStatuses: v })}
          />
        </div>
      )}
    </div>
  )
}
