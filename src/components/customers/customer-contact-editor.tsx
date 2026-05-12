'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export type CustomerContact = {
  name: string
  email: string
  phone_office: string
  phone_cell: string
  role: string
  is_primary: boolean
  notes: string
}

function emptyContact(): CustomerContact {
  return { name: '', email: '', phone_office: '', phone_cell: '', role: '', is_primary: false, notes: '' }
}

export function CustomerContactEditor({
  contacts,
  onChange,
}: {
  contacts: CustomerContact[]
  onChange: (contacts: CustomerContact[]) => void
}) {
  function update(index: number, field: keyof CustomerContact, value: string | boolean) {
    const next = contacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
    onChange(next)
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
        <h3 className="text-sm font-medium">Contacts</h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Contact
        </button>
      </div>

      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      )}

      {contacts.map((contact, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Contact {index + 1}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id={`primary-${index}`}
                  checked={contact.is_primary}
                  onCheckedChange={v => update(index, 'is_primary', v)}
                />
                <Label htmlFor={`primary-${index}`} className="text-xs cursor-pointer">Primary</Label>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={contact.name} onChange={e => update(index, 'name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Input value={contact.role} onChange={e => update(index, 'role', e.target.value)} placeholder="e.g. Purchasing" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={contact.email} onChange={e => update(index, 'email', e.target.value)} placeholder="email@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Office Phone</Label>
              <Input value={contact.phone_office} onChange={e => update(index, 'phone_office', e.target.value)} placeholder="Office number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cell Phone</Label>
              <Input value={contact.phone_cell} onChange={e => update(index, 'phone_cell', e.target.value)} placeholder="Cell number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input value={contact.notes} onChange={e => update(index, 'notes', e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}