'use client'

import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ContactSuggestInput, type ContactSuggestion } from '@/components/orders/contact-suggest-input'
import type { OrderFormValues } from '@/lib/orders/order-form-schema'

type RegisterFn = ReturnType<typeof useForm<OrderFormValues>>['register']

export function OrderContactFields({ control, register: _register, setValue, globalContacts = [] }: {
  control: Control<OrderFormValues>
  register: RegisterFn
  setValue: UseFormSetValue<OrderFormValues>
  globalContacts?: ContactSuggestion[]
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'customer_contacts' })
  const watched = useWatch({ control, name: 'customer_contacts' })

  function selectSuggestion(idx: number, s: ContactSuggestion) {
    setValue(`customer_contacts.${idx}.name`, s.name)
    setValue(`customer_contacts.${idx}.email`, s.email)
  }

  return (
    <div className="col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <Label>Customer Contacts For Order Confirmations</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', email: '', is_primary: fields.length === 0 })}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Add Contact
        </Button>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground">No contacts added. Add a contact with an email to generate an Outlook link after saving.</p>}
      {fields.map((field, idx) => {
        const isPrimary = (watched?.[idx]?.is_primary) !== false
        const nameVal = watched?.[idx]?.name ?? ''
        const emailVal = watched?.[idx]?.email ?? ''
        return (
          <div key={field.id} className="grid grid-cols-6 gap-2 rounded-md border p-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <ContactSuggestInput
                value={nameVal}
                onChange={v => setValue(`customer_contacts.${idx}.name`, v)}
                onSelectSuggestion={s => selectSuggestion(idx, s)}
                suggestions={globalContacts}
                placeholder="Full name"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <ContactSuggestInput
                type="email"
                value={emailVal}
                onChange={v => setValue(`customer_contacts.${idx}.email`, v)}
                onSelectSuggestion={s => selectSuggestion(idx, s)}
                suggestions={globalContacts}
                placeholder="email@company.com"
              />
            </div>
            <div className="col-span-1 flex flex-col justify-end gap-1">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <div className="flex rounded-md border overflow-hidden h-9 text-xs">
                <button type="button"
                  className={`flex-1 px-2 transition-colors ${isPrimary ? 'bg-[#00205B] text-white' : 'bg-background text-muted-foreground hover:bg-accent'}`}
                  onClick={() => setValue(`customer_contacts.${idx}.is_primary`, true)}>To</button>
                <button type="button"
                  className={`flex-1 px-2 transition-colors ${!isPrimary ? 'bg-[#00205B] text-white' : 'bg-background text-muted-foreground hover:bg-accent'}`}
                  onClick={() => setValue(`customer_contacts.${idx}.is_primary`, false)}>Cc</button>
              </div>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
