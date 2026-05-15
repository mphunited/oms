'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  carriers: string[]
  freightCarrier: string
  freightCost: string
  freightToCustomer: string
  additionalCosts: string
  appointmentTime: string
  appointmentNotes: string
  onFreightCarrierChange: (v: string) => void
  onFreightCostChange: (v: string) => void
  onFreightToCustomerChange: (v: string) => void
  onAdditionalCostsChange: (v: string) => void
  onAppointmentTimeChange: (v: string) => void
  onAppointmentNotesChange: (v: string) => void
}

export function EditOrderFreightSection({
  carriers,
  freightCarrier,
  freightCost,
  freightToCustomer,
  additionalCosts,
  appointmentTime,
  appointmentNotes,
  onFreightCarrierChange,
  onFreightCostChange,
  onFreightToCustomerChange,
  onAdditionalCostsChange,
  onAppointmentTimeChange,
  onAppointmentNotesChange,
}: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
        <h3 className="text-[13px] font-semibold text-foreground tracking-normal">Freight & logistics</h3>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <Label>Freight Carrier</Label>
          <Select value={freightCarrier} onValueChange={v => { if (v) onFreightCarrierChange(v) }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select carrier" /></SelectTrigger>
            <SelectContent>{carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>MPH Freight Cost</Label>
          <Input type="number" min="0" step="0.01" value={freightCost} onChange={e => onFreightCostChange(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label>Customer Freight Cost</Label>
          <Input type="number" min="0" step="0.01" value={freightToCustomer} onChange={e => onFreightToCustomerChange(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label>Additional Costs</Label>
          <Input type="number" min="0" step="0.01" value={additionalCosts} onChange={e => onAdditionalCostsChange(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Appointment Time</Label>
          <Input value={appointmentTime} onChange={e => onAppointmentTimeChange(e.target.value)} placeholder="e.g. 9:00 AM – 10:00 AM" />
        </div>
        <div className="space-y-1.5">
          <Label>Appointment Notes</Label>
          <Input value={appointmentNotes} onChange={e => onAppointmentNotesChange(e.target.value)} placeholder="Optional" />
        </div>
      </div>
    </section>
  )
}
