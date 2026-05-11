'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type CommissionFilters = {
  salespersonId: string
  startDate: string
  endDate: string
  commissionStatus: string
  invoiceStatus: string
  commissionPaidDateFrom: string
  commissionPaidDateTo: string
  search: string
  customerId: string
  vendorId: string
}

type Salesperson = { id: string; name: string | null }
type NamedItem = { id: string; name: string }

type Props = {
  filters: CommissionFilters
  salespersons: Salesperson[]
  customers: NamedItem[]
  vendors: NamedItem[]
  role: string | null
  onChange: (f: Partial<CommissionFilters>) => void
}

const COMMISSION_STATUS_PILLS = ['All', 'Not Eligible', 'Pending', 'Paid'] as const
const INVOICE_STATUS_PILLS = ['All', 'Not Invoiced', 'Invoiced', 'Paid'] as const

function PillGroup({
  pills,
  active,
  onSelect,
}: {
  pills: readonly string[]
  active: string
  onSelect: (v: string) => void
}) {
  return (
    <div className="flex gap-1">
      {pills.map(pill => {
        const value = pill === 'All' ? '' : pill
        const isActive = active === value
        return (
          <button
            key={pill}
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-[#00205B] bg-[#00205B] text-white'
                : 'border-border bg-background text-muted-foreground hover:border-[#00205B]/50 hover:text-foreground'
            )}
          >
            {pill}
          </button>
        )
      })}
    </div>
  )
}

export function CommissionFiltersBar({ filters, salespersons, customers, vendors, role, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="commission-search" className="text-xs text-muted-foreground">Search</label>
          <Input
            id="commission-search"
            placeholder="Search order # or customer PO…"
            className="h-8 w-56 text-sm"
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="customer-filter" className="text-xs text-muted-foreground">Customer</label>
          <Select
            value={filters.customerId ?? undefined}
            onValueChange={v => onChange({ customerId: v === '_all' ? '' : v })}
          >
            <SelectTrigger id="customer-filter" className="h-8 w-44 text-sm">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All customers</SelectItem>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="vendor-filter" className="text-xs text-muted-foreground">Vendor</label>
          <Select
            value={filters.vendorId ?? undefined}
            onValueChange={v => onChange({ vendorId: v === '_all' ? '' : v })}
          >
            <SelectTrigger id="vendor-filter" className="h-8 w-44 text-sm">
              <SelectValue placeholder="All vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All vendors</SelectItem>
              {vendors.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(role === 'ADMIN' || role === 'ACCOUNTING') && (
          <div className="space-y-1">
            <label htmlFor="salesperson-filter" className="text-xs text-muted-foreground">Salesperson</label>
            <Select
              value={filters.salespersonId}
              onValueChange={v => onChange({ salespersonId: v === '_all' ? '' : v })}
            >
              <SelectTrigger id="salesperson-filter" className="h-8 w-44 text-sm">
                <SelectValue placeholder="All salespersons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All</SelectItem>
                {salespersons.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name ?? s.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="ship-date-from" className="text-xs text-muted-foreground">Ship Date From</label>
          <Input
            id="ship-date-from"
            type="date"
            className="h-8 w-36 text-sm"
            value={filters.startDate}
            onChange={e => onChange({ startDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ship-date-to" className="text-xs text-muted-foreground">To</label>
          <Input
            id="ship-date-to"
            type="date"
            className="h-8 w-36 text-sm"
            value={filters.endDate}
            onChange={e => onChange({ endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Commission Status</p>
          <PillGroup
            pills={COMMISSION_STATUS_PILLS}
            active={filters.commissionStatus}
            onSelect={v => onChange({ commissionStatus: v })}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Invoice Status</p>
          <PillGroup
            pills={INVOICE_STATUS_PILLS}
            active={filters.invoiceStatus}
            onSelect={v => onChange({ invoiceStatus: v })}
          />
        </div>

        {filters.commissionStatus === 'Paid' && (
          <>
            <div className="space-y-1">
              <label htmlFor="comm-paid-from" className="text-xs text-muted-foreground">Comm Paid From</label>
              <Input
                id="comm-paid-from"
                type="date"
                className="h-8 w-36 text-sm"
                value={filters.commissionPaidDateFrom}
                onChange={e => onChange({ commissionPaidDateFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="comm-paid-to" className="text-xs text-muted-foreground">To</label>
              <Input
                id="comm-paid-to"
                type="date"
                className="h-8 w-36 text-sm"
                value={filters.commissionPaidDateTo}
                onChange={e => onChange({ commissionPaidDateTo: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
