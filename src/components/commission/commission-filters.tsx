'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CommissionFilters = {
  salespersonId: string
  startDate: string
  endDate: string
  commissionStatus: string
  invoicePaymentStatus: string
  commissionPaidDateFrom: string
  commissionPaidDateTo: string
}

type Salesperson = { id: string; name: string | null }

type Props = {
  filters: CommissionFilters
  salespersons: Salesperson[]
  role: string | null
  onChange: (f: Partial<CommissionFilters>) => void
}

export function CommissionFiltersBar({ filters, salespersons, role, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {(role === 'ADMIN' || role === 'ACCOUNTING') && (
        <div className="space-y-1">
          <label htmlFor="salesperson-filter" className="text-xs text-muted-foreground">Salesperson</label>
          <Select
            value={filters.salespersonId}
            onValueChange={v => onChange({ salespersonId: v ?? '' })}
          >
            <SelectTrigger id="salesperson-filter" className="h-8 w-44 text-sm">
              <SelectValue placeholder="All salespersons">
                {filters.salespersonId
                  ? (salespersons.find(u => u.id === filters.salespersonId)?.name ?? filters.salespersonId)
                  : 'All salespersons'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {salespersons.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name ?? s.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <label htmlFor="commission-status-filter" className="text-xs text-muted-foreground">Commission Status</label>
        <Select
          value={filters.commissionStatus}
          onValueChange={v => onChange({ commissionStatus: v ?? 'unpaid' })}
        >
          <SelectTrigger id="commission-status-filter" className="h-8 w-40 text-sm">
            <SelectValue placeholder="Unpaid" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label htmlFor="invoice-status-filter" className="text-xs text-muted-foreground">Invoice Status</label>
        <Select
          value={filters.invoicePaymentStatus}
          onValueChange={v => onChange({ invoicePaymentStatus: v ?? '' })}
        >
          <SelectTrigger id="invoice-status-filter" className="h-8 w-40 text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Unpaid">Unpaid</SelectItem>
            <SelectItem value="Partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
      {filters.commissionStatus !== 'unpaid' && (
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
  )
}
