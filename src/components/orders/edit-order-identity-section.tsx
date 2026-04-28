'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { OrderCombobox } from '@/components/orders/order-combobox'

type UserOption = { id: string; name: string | null }
type ComboboxOption = { id: string; name: string }

type Props = {
  orderDate: string
  status: string
  statusOptions: string[]
  salespersonId: string
  salespersonOptions: ComboboxOption[]
  csrId: string
  csr2Id: string | null
  csrUserOptions: UserOption[]
  isBlind: boolean
  onOrderDateChange: (v: string) => void
  onStatusChange: (v: string) => void
  onSalespersonChange: (v: string) => void
  onCsrChange: (v: string) => void
  onCsr2Change: (v: string | null) => void
  onIsBlindChange: (v: boolean) => void
}

export function EditOrderIdentitySection({
  orderDate,
  status,
  statusOptions,
  salespersonId,
  salespersonOptions,
  csrId,
  csr2Id,
  csrUserOptions,
  isBlind,
  onOrderDateChange,
  onStatusChange,
  onSalespersonChange,
  onCsrChange,
  onCsr2Change,
  onIsBlindChange,
}: Props) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Order Identity</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Order Date</Label>
          <Input type="date" value={orderDate} onChange={e => onOrderDateChange(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={v => { if (v) onStatusChange(v) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="min-w-0 space-y-1.5">
          <Label>Salesperson</Label>
          <OrderCombobox
            options={salespersonOptions}
            value={salespersonId}
            onChange={v => onSalespersonChange(v)}
            placeholder="Choose salesperson"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>CSR</Label>
          <Select value={csrId} onValueChange={v => onCsrChange(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select CSR">
              {csrId ? (csrUserOptions.find(u => u.id === csrId)?.name ?? csrId) : 'Select CSR'}
            </SelectValue></SelectTrigger>
            <SelectContent>{csrUserOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>CSR 2 (optional)</Label>
          <Select value={csr2Id ?? 'none'} onValueChange={v => onCsr2Change(v === 'none' ? null : (v ?? null))}>
            <SelectTrigger className="w-full"><SelectValue placeholder="None">
              {csr2Id && csr2Id !== 'none' ? (csrUserOptions.find(u => u.id === csr2Id)?.name ?? csr2Id) : 'None'}
            </SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {csrUserOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Switch id="is_blind" checked={isBlind} onCheckedChange={onIsBlindChange} />
        <Label htmlFor="is_blind" className="cursor-pointer">Blind Shipment</Label>
      </div>
    </section>
  )
}
