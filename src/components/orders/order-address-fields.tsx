'use client'

import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OrderFormValues } from '@/lib/orders/order-form-schema'

export function OrderAddressFields({ prefix, register, notesLabel }: {
  prefix: 'ship_to' | 'bill_to'
  register: ReturnType<typeof useForm<OrderFormValues>>['register']
  notesLabel: string
}) {
  return (
    <div className="grid grid-cols-6 gap-3">
      <div className="col-span-6 space-y-1.5"><Label>Name / Company</Label><Input placeholder="Name or company" {...register(`${prefix}.name`)} /></div>
      <div className="col-span-6 space-y-1.5"><Label>Street</Label><Input placeholder="Street address" {...register(`${prefix}.street`)} /></div>
      <div className="col-span-3 space-y-1.5"><Label>City</Label><Input placeholder="City" {...register(`${prefix}.city`)} /></div>
      <div className="col-span-1 space-y-1.5"><Label>State</Label><Input placeholder="ST" {...register(`${prefix}.state`)} /></div>
      <div className="col-span-2 space-y-1.5"><Label>ZIP</Label><Input placeholder="00000" {...register(`${prefix}.zip`)} /></div>
      <div className="col-span-3 space-y-1.5"><Label>Phone</Label><Input placeholder="Phone" {...register(`${prefix}.phone`)} /></div>
      <div className="col-span-6 space-y-1.5"><Label>{notesLabel}</Label><Input placeholder="Optional" {...register(`${prefix}.shipping_notes`)} /></div>
    </div>
  )
}
