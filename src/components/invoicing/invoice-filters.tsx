'use client'

import { useEffect, useState } from 'react'

export const STATUS_OPTIONS = ['Not Invoiced', 'Invoiced', 'Paid'] as const

export type InvoiceFilters = {
  customerId: string
  invoiceStatus: string[]
  shipDateFrom: string
  shipDateTo: string
}

export const DEFAULT_INVOICE_FILTERS: InvoiceFilters = {
  customerId: '',
  invoiceStatus: ['Not Invoiced'],
  shipDateFrom: '',
  shipDateTo: '',
}

type CustomerOption = { id: string; name: string }

type Props = {
  filters: InvoiceFilters
  onChange: (update: Partial<InvoiceFilters>) => void
}

export function InvoiceFilters({ filters, onChange }: Props) {
  const [customers, setCustomers] = useState<CustomerOption[]>([])

  useEffect(() => {
    fetch('/api/customers?limit=500')
      .then(r => r.json())
      .then((data: { customers?: CustomerOption[] }) => {
        setCustomers(data.customers ?? [])
      })
      .catch(() => setCustomers([]))
  }, [])

  function toggleStatus(val: string) {
    const next = filters.invoiceStatus.includes(val)
      ? filters.invoiceStatus.filter(s => s !== val)
      : [...filters.invoiceStatus, val]
    onChange({ invoiceStatus: next })
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 px-4 py-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Customer</label>
        <select
          value={filters.customerId}
          onChange={e => onChange({ customerId: e.target.value })}
          className="h-8 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

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

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Ship Date From</label>
        <input
          type="date"
          value={filters.shipDateFrom}
          onChange={e => onChange({ shipDateFrom: e.target.value })}
          className="h-8 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Ship Date To</label>
        <input
          type="date"
          value={filters.shipDateTo}
          onChange={e => onChange({ shipDateTo: e.target.value })}
          className="h-8 rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#00205B]"
        />
      </div>

      {(filters.customerId || filters.shipDateFrom || filters.shipDateTo ||
        JSON.stringify(filters.invoiceStatus) !== JSON.stringify(DEFAULT_INVOICE_FILTERS.invoiceStatus)) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_INVOICE_FILTERS)}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  )
}
