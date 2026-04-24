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
          <label className="text-xs text-muted-foreground">Salesperson</label>
          <Select
            value={filters.salespersonId}
            onValueChange={v => onChange({ salespersonId: v })}
          >
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All salespersons" />
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
        <label className="text-xs text-muted-foreground">Ship Date From</label>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={filters.startDate}
          onChange={e => onChange({ startDate: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={filters.endDate}
          onChange={e => onChange({ endDate: e.target.value })}
        />
      </div>
    </div>
  )
}
