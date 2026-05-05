'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { FilterMultiSelect } from './filter-multi-select'
import { formatVendorName } from '@/lib/utils/format-vendor-name'

export type FilterState = {
  search: string
  lifecycle: 'active' | 'complete' | 'all'
  statuses: string[]
  flagOnly: boolean
  vendorIds: string[]
  customerIds: string[]
  salespersonIds: string[]
  csrIds: string[]
  shipDateFrom: string
  shipDateTo: string
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  lifecycle: 'active',
  statuses: [],
  flagOnly: false,
  vendorIds: [],
  customerIds: [],
  salespersonIds: [],
  csrIds: [],
  shipDateFrom: '',
  shipDateTo: '',
}

type NamedItem = { id: string; name: string }

type Props = {
  filters: FilterState
  onChange: (update: Partial<FilterState>) => void
  onClearAll: () => void
}

const PILLS = [
  {
    label: 'Active',
    isActive: (f: FilterState) => f.lifecycle === 'active' && !f.flagOnly,
    action: (onChange: Props['onChange']) => onChange({ lifecycle: 'active', flagOnly: false }),
  },
  {
    label: 'Complete',
    isActive: (f: FilterState) => f.lifecycle === 'complete' && !f.flagOnly,
    action: (onChange: Props['onChange']) => onChange({ lifecycle: 'complete', flagOnly: false }),
  },
  {
    label: 'Flagged',
    isActive: (f: FilterState) => f.flagOnly,
    action: (onChange: Props['onChange']) => onChange({ lifecycle: 'all', flagOnly: true }),
  },
  {
    label: 'All',
    isActive: (f: FilterState) => f.lifecycle === 'all' && !f.flagOnly,
    action: (onChange: Props['onChange']) => onChange({ lifecycle: 'all', flagOnly: false }),
  },
] as const

export function OrdersFilterBar({ filters, onChange, onClearAll }: Props) {
  const [vendors, setVendors] = useState<NamedItem[]>([])
  const [customers, setCustomers] = useState<NamedItem[]>([])
  const [salespersons, setSalespersons] = useState<NamedItem[]>([])
  const [csrUsers, setCsrUsers] = useState<NamedItem[]>([])
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    fetch('/api/vendors')
      .then(r => r.json())
      .then((d: NamedItem[]) => setVendors(d.map(v => ({ id: v.id, name: v.name }))))
      .catch(() => {})
    fetch('/api/customers')
      .then(r => r.json())
      .then((d: NamedItem[]) => setCustomers(d.map(c => ({ id: c.id, name: c.name }))))
      .catch(() => {})
    fetch('/api/users?permission=SALES')
      .then(r => r.json())
      .then((d: NamedItem[]) => setSalespersons(d))
      .catch(() => {})
    fetch('/api/users?permission=CSR')
      .then(r => r.json())
      .then((d: NamedItem[]) => setCsrUsers(d))
      .catch(() => {})
    fetch('/api/dropdown-configs?type=ORDER_STATUS')
      .then(r => r.json())
      .then((d: { values: string[] }) => setStatusOptions((d.values ?? []).map(s => ({ value: s, label: s }))))
      .catch(() => {})
  }, [])

  const hasAnyFilter =
    !!filters.search ||
    filters.lifecycle !== 'active' ||
    filters.statuses.length > 0 ||
    filters.flagOnly ||
    filters.salespersonIds.length > 0 ||
    filters.vendorIds.length > 0 ||
    filters.customerIds.length > 0 ||
    filters.csrIds.length > 0 ||
    !!filters.shipDateFrom ||
    !!filters.shipDateTo

  return (
    <div className="space-y-2 rounded-md border bg-card p-3">
      {/* Row 1: Search, lifecycle pills, status, clear */}
      <div className="flex flex-wrap items-center gap-2">
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

        <div className="flex overflow-hidden rounded-md border">
          {PILLS.map(pill => (
            <button
              key={pill.label}
              type="button"
              onClick={() => pill.action(onChange)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                pill.isActive(filters)
                  ? 'bg-[#00205B] text-white'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <FilterMultiSelect
          label="Status"
          options={statusOptions}
          selected={filters.statuses}
          onChange={v => onChange({ statuses: v })}
        />

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
        <Link
          href="/orders/new"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#00205B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#B88A44] transition-colors"
        >
          + New Order
        </Link>
      </div>

      {/* Row 2: Customer, Vendor, CSR, Salesperson, Ship Date */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterMultiSelect
          label="Customer"
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          selected={filters.customerIds}
          onChange={v => onChange({ customerIds: v })}
        />
        <FilterMultiSelect
          label="Vendor"
          options={vendors.map(v => ({ value: v.id, label: formatVendorName(v.name) }))}
          selected={filters.vendorIds}
          onChange={v => onChange({ vendorIds: v })}
        />
        <FilterMultiSelect
          label="CSR"
          options={csrUsers.map(u => ({ value: u.id, label: u.name }))}
          selected={filters.csrIds}
          onChange={v => onChange({ csrIds: v })}
        />
        <FilterMultiSelect
          label="Salesperson"
          options={salespersons.map(u => ({ value: u.id, label: u.name }))}
          selected={filters.salespersonIds}
          onChange={v => onChange({ salespersonIds: v })}
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
      </div>
    </div>
  )
}
