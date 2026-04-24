'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SplitLoadRow } from './split-load-row'
import { emptyLoad, type SplitLoadValue } from '@/lib/orders/order-form-schema'

type Props = {
  loads: SplitLoadValue[]
  orderPo: string
  orderCustomerPo: string
  orderShipDate: string
  orderWantedDate: string
  terms: string
  csrInitials: string
  onTermsChange: (v: string) => void
  onChange: (loads: SplitLoadValue[]) => void
}

export function OrderSplitLoadsEditor({
  loads, orderPo, orderCustomerPo, orderShipDate, orderWantedDate,
  terms, csrInitials, onTermsChange, onChange,
}: Props) {
  const [assigningPoIndex, setAssigningPoIndex] = useState<number | null>(null)

  function update(index: number, load: SplitLoadValue) {
    onChange(loads.map((l, i) => i === index ? load : l))
  }

  function add() { onChange([...loads, emptyLoad()]) }

  function remove(index: number) {
    if (loads.length === 1) return
    onChange(loads.filter((_, i) => i !== index))
  }

  async function handleAssignPo(index: number) {
    setAssigningPoIndex(index)
    try {
      const res = await fetch(`/api/orders/next-po-preview?initials=${encodeURIComponent(csrInitials)}`)
      const { preview } = await res.json()
      onChange(loads.map((l, i) => i === index ? { ...l, separate_po: true, preview_po: preview } : l))
    } finally {
      setAssigningPoIndex(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Line Items</h3>
        <button type="button" onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Split Load
        </button>
      </div>
      {loads.map((load, index) => (
        <SplitLoadRow
          key={index}
          load={load}
          index={index}
          orderPo={orderPo}
          orderCustomerPo={orderCustomerPo}
          orderShipDate={orderShipDate}
          orderWantedDate={orderWantedDate}
          terms={terms}
          onTermsChange={onTermsChange}
          onChange={updated => update(index, updated)}
          onRemove={() => remove(index)}
          onAssignPo={() => handleAssignPo(index)}
          assigningPo={assigningPoIndex === index}
        />
      ))}
    </div>
  )
}
