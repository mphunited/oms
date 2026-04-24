'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OrderFormValues } from '@/lib/orders/order-form-schema'

type RegisterFn = ReturnType<typeof useForm<OrderFormValues>>['register']

export function OrderContactFields({ control, register }: {
  control: Control<OrderFormValues>
  register: RegisterFn
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'customer_contacts' })
  return (
    <div className="col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <Label>Customer Contacts For Order Confirmations</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', email: '' })}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Contact</Button>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground">No contacts added. Add a contact with an email to generate an Outlook link after saving.</p>}
      {fields.map((field, idx) => (
        <div key={field.id} className="grid grid-cols-5 gap-2 rounded-md border p-3">
          <div className="col-span-2 space-y-1"><Label className="text-xs text-muted-foreground">Name</Label><Input placeholder="Full name" {...register(`customer_contacts.${idx}.name`)} /></div>
          <div className="col-span-3 space-y-1"><Label className="text-xs text-muted-foreground">Email</Label>
            <div className="flex gap-1.5">
              <Input type="email" placeholder="email@company.com" {...register(`customer_contacts.${idx}.email`)} />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
