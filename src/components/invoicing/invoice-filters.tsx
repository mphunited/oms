'use client'

import { useEffect, useRef, useState } from 'react'

export const STATUS_OPTIONS = ['Not Invoiced', 'Invoiced', 'Paid'] as const

export type InvoiceFilters = {
  search: string
  customerId: string
  vendorId: string
  csrId: string
  salespersonId: string
  invoiceStatus: string[]
  shipDateFrom: string
  shipDateTo: string
}

export const DEFAULT_INVOICE_FILTERS: InvoiceFilters = {
  search: '',
  customerId: '',
  vendorId: '',
  csrId: '',
  salespersonId: '',
  invoiceStatus: ['Not Invoiced'],
  shipDateFrom: '',
  shipDateTo: '',
}

type DropdownOption = { id: string; name: string }

type Props = {
  filters: InvoiceFilters
  onChange: (update: Partial<InvoiceFilters>) => void
}

export function InvoiceFilters({ filters, onChange }: Props) {
  const [customers, setCustomers]     = useState<DropdownOption[]>([])
  const [vendors, setVendors]         = useState<DropdownOption[]>([])
  const [csrUsers, setCsrUsers]       = useState<DropdownOption[]>([])
  const [salesUsers, setSalesUsers]   = useState<DropdownOption[]>([])

  // Local search value for debouncing
  const [searchInput, setSearchInput] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local input in sync if URL param changes externally (e.g. Clear Filters)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled input sync with URL params
  useEffect(() => { setSearchInput(filters.search) }, [filters.search])

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then((data: DropdownOption[] | unknown) => {
        setCustomers(Array.isArray(data) ? (data as DropdownOption[]) : [])
      })
      .catch(() => setCustomers([]))

    fetch('/api/vendors')
      .then(r => r.json())
      .then((data: DropdownOption[] | unknown) => {
        setVendors(Array.isArray(data) ? (data as DropdownOption[]) : [])
      })
      .catch(() => setVendors([]))

    fetch('/api/users?permission=CSR')
      .then(r => r.json())
      .then((data: DropdownOption[] | unknown) => {
        setCsrUsers(Array.isArray(data) ? (data as DropdownOption[]) : [])
      })
      .catch(() => setCsrUsers([]))

    fetch('/api/users?permission=SALES')
      .then(r => r.json())
      .then((data: DropdownOption[] | unknown) => {
        setSalesUsers(Array.isArray(data) ? (data as DropdownOption[]) : [])
      })
      .catch(() => setSalesUsers([]))
  }, [])

  function handleSearchChange(val: string) {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange({ search: val }), 300)
  }

  function toggleStatus(val: string) {
    const next = filters.invoiceStatus.includes(val)
      ? filters.invoiceStatus.filter(s => s !== val)
      : [...filters.invoiceStatus, val]
    onChange({ invoiceStatus: next })
  }

  const isDirty =
    filters.search ||
    filters.customerId ||
    filters.vendorId ||
    filters.csrId ||
    filters.salespersonId ||
    filters.shipDateFrom ||
    filters.shipDateTo ||
    JSON.stringify(filters.invoiceStatus) !== JSON.stringify(DEFAULT_INVOICE_FILTERS.invoiceStatus)

  const selectCls = 'h-8 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]'

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 px-4 py-3">

      {/* Search */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Search</label>
        <input
          type="search"
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="PO number, customer PO…"
          className="h-8 w-52 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
        />
      </div>

      {/* Customer */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Customer</label>
        <select value={filters.customerId} onChange={e => onChange({ customerId: e.target.value })} className={selectCls}>
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Vendor */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Vendor</label>
        <select value={filters.vendorId} onChange={e => onChange({ vendorId: e.target.value })} className={selectCls}>
          <option value="">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      {/* CSR */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">CSR</label>
        <select value={filters.csrId} onChange={e => onChange({ csrId: e.target.value })} className={selectCls}>
          <option value="">All CSRs</option>
          {csrUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* Salesperson */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Salesperson</label>
        <select value={filters.salespersonId} onChange={e => onChange({ salespersonId: e.target.value })} className={selectCls}>
          <option value="">All Salespeople</option>
          {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {/* Invoice Status */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Invoice Status</label>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
                filters.invoiceStatus.includes(s)
                  ? 'bg-[#00205B] text-white border-[#00205B]'
                  : 'bg-background text-muted-foreground border-border hover:border-[#00205B]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Ship Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Ship Date From</label>
        <input
          type="date"
          value={filters.shipDateFrom}
          onChange={e => onChange({ shipDateFrom: e.target.value })}
          className={selectCls}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Ship Date To</label>
        <input
          type="date"
          value={filters.shipDateTo}
          onChange={e => onChange({ shipDateTo: e.target.value })}
          className={selectCls}
        />
      </div>

      {isDirty && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_INVOICE_FILTERS)}
          className="self-end rounded border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}
