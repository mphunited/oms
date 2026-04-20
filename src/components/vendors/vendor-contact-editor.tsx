'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export type VendorContact = {
  name: string
  email: string
  phone: string
  is_primary: boolean
}

function emptyContact(): VendorContact {
  return { name: '', email: '', phone: '', is_primary: false }
}

export function VendorContactEditor({
  title,
  contacts,
  onChange,
}: {
  title: string
  contacts: VendorContact[]
  onChange: (contacts: VendorContact[]) => void
}) {
  function update(index: number, field: keyof VendorContact, value: string | boolean) {
    onChange(contacts.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function add() {
    onChange([...contacts, emptyContact()])
  }

  function remove(index: number) {
    onChange(contacts.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      )}

      {contacts.map((contact, index) => (
        <div key={index} className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id={`${title}-primary-${index}`}
                checked={contact.is_primary}
                onCheckedChange={v => update(index, 'is_primary', v)}
              />
              <Label htmlFor={`${title}-primary-${index}`} className="text-xs cursor-pointer">Primary</Label>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={contact.name} onChange={e => update(index, 'name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={contact.email} onChange={e => update(index, 'email', e.target.value)} placeholder="email@vendor.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={contact.phone} onChange={e => update(index, 'phone', e.target.value)} placeholder="Phone number" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}