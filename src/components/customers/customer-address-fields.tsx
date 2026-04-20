'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type AddressValue = {
  street: string
  city: string
  state: string
  zip: string
}

function emptyAddress(): AddressValue {
  return { street: '', city: '', state: '', zip: '' }
}

export function CustomerAddressFields({
  label,
  value,
  onChange,
}: {
  label: string
  value: AddressValue | null | undefined
  onChange: (v: AddressValue) => void
}) {
  const addr = value ?? emptyAddress()

  function update(field: keyof AddressValue, val: string) {
    onChange({ ...addr, [field]: val })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Street</Label>
          <Input value={addr.street} onChange={e => update('street', e.target.value)} placeholder="Street address" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={addr.city} onChange={e => update('city', e.target.value)} placeholder="City" />
        </div>
        <div className="col-span-1 space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input value={addr.state} onChange={e => update('state', e.target.value)} placeholder="ST" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">ZIP</Label>
          <Input value={addr.zip} onChange={e => update('zip', e.target.value)} placeholder="00000" />
        </div>
      </div>
    </div>
  )
}