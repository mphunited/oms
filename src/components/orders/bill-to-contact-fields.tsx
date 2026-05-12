'use client'

import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ContactSuggestInput, type ContactSuggestion } from '@/components/orders/contact-suggest-input'
import type { OrderFormValues } from '@/lib/orders/order-form-schema'

type RegisterFn = ReturnType<typeof useForm<OrderFormValues>>['register']

export function BillToContactFields({ control, register: _register, setValue, globalContacts = [] }: {
  control: Control<OrderFormValues>
  register: RegisterFn
  setValue: UseFormSetValue<OrderFormValues>
  globalContacts?: ContactSuggestion[]
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'bill_to_contacts' })
  const watched = useWatch({ control, name: 'bill_to_contacts' })

  function selectSuggestion(idx: number, s: ContactSuggestion) {
    setValue(`bill_to_contacts.${idx}.name`, s.name)
    setValue(`bill_to_contacts.${idx}.email`, s.email)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Bill To Contacts</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', email: '' })}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Add Contact
        </Button>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground">No billing contacts added.</p>}
      {fields.map((field, idx) => (
        <div key={field.id} className="grid grid-cols-5 gap-2 rounded-md border p-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <ContactSuggestInput
              value={watched?.[idx]?.name ?? ''}
              onChange={v => setValue(`bill_to_contacts.${idx}.name`, v)}
              onSelectSuggestion={s => selectSuggestion(idx, s)}
              suggestions={globalContacts}
              placeholder="Full name"
            />
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <div className="flex gap-1.5">
              <ContactSuggestInput
                type="email"
                value={watched?.[idx]?.email ?? ''}
                onChange={v => setValue(`bill_to_contacts.${idx}.email`, v)}
                onSelectSuggestion={s => selectSuggestion(idx, s)}
                suggestions={globalContacts}
                placeholder="email@company.com"
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
