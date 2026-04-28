'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type VendorContact = {
  name: string
  email: string
  phone: string
  role: 'to' | 'cc'
}

function emptyContact(): VendorContact {
  return { name: '', email: '', phone: '', role: 'cc' }
}

export function VendorContactEditor({
  title,
  contacts,
  onChange,
  error,
}: {
  title: string
  contacts: VendorContact[]
  onChange: (contacts: VendorContact[]) => void
  error?: string
}) {
  function update(index: number, field: keyof VendorContact, value: string) {
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

      {error && <p className="text-xs text-destructive">{error}</p>}

      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      )}

      {contacts.map((contact, index) => (
        <div key={index} className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <select
                value={contact.role}
                onChange={e => update(index, 'role', e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#00205B]"
              >
                <option value="to">To</option>
                <option value="cc">CC</option>
              </select>
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
