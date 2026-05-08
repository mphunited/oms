'use client'

import { useNewIbcForm } from '@/lib/recycling/use-new-ibc-form'
import { RECYCLING_STATUSES, RECYCLING_INVOICE_STATUSES, INVOICE_PAYMENT_STATUSES } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2 } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="text-sm font-semibold text-[#00205B]">{title}</h2>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function NewIbcForm() {
  const {
    form, set, setAddress, addContact, updateContact, removeContact,
    submit, submitting, carriers, salespeople, csrList, customers, vendorList,
  } = useNewIbcForm()

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Order Info */}
      <Section title="Order Info">
        <Row>
          <Field label="Order Date">
            <Input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {RECYCLING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Row>
      </Section>

      {/* IBC Source & Processing Facility */}
      <Section title="IBC Source & Processing Facility">
        <Row>
          <Field label="IBC Source *">
            <select value={form.customer_id} onChange={e => set('customer_id', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Processing Facility">
            <select value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select vendor…</option>
              {vendorList.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Salesperson">
            <select value={form.salesperson_id} onChange={e => set('salesperson_id', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {salespeople.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="CSR">
            <select value={form.csr_id} onChange={e => set('csr_id', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {csrList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        </Row>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_blind_shipment}
            onCheckedChange={v => set('is_blind_shipment', v)}
            id="blind"
          />
          <Label htmlFor="blind" className="text-sm cursor-pointer">Blind Shipment</Label>
        </div>
      </Section>

      {/* Order Details */}
      <Section title="Order Details">
        <Row>
          <Field label="Customer PO">
            <Input value={form.customer_po} onChange={e => set('customer_po', e.target.value)} />
          </Field>
          <Field label="Product (P/N)">
            <Input value={form.part_number} onChange={e => set('part_number', e.target.value)} placeholder="e.g. IBC" />
          </Field>
        </Row>
        <Field label="Description">
          <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. 275 empties" />
        </Field>
        <Row>
          <Field label="Qty">
            <Input type="number" step="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </Field>
          <Field label="Buy">
            <Input type="number" step="0.01" value={form.buy} onChange={e => set('buy', e.target.value)} />
          </Field>
        </Row>
        <Field label="Sell (optional)">
          <Input type="number" step="0.01" value={form.sell} onChange={e => set('sell', e.target.value)} />
        </Field>
      </Section>

      {/* Dates & Logistics */}
      <Section title="Dates & Logistics">
        <Row>
          <Field label="Ship Date">
            <Input type="date" value={form.pick_up_date} onChange={e => set('pick_up_date', e.target.value)} />
          </Field>
          <Field label="Delivery Date">
            <Input type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
          </Field>
        </Row>
        <Row>
          <Field label="Appointment">
            <Input value={form.appointment_notes} onChange={e => set('appointment_notes', e.target.value)} />
          </Field>
          <Field label="Freight Carrier">
            <select value={form.freight_carrier} onChange={e => set('freight_carrier', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select carrier…</option>
              {carriers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </Row>
      </Section>

      {/* Ship To / Pick-Up Location */}
      <Section title="Ship To / Pick-Up Location">
        {(['name','street','city','state','zip'] as const).map(k => (
          <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
            <Input value={form.ship_to[k]} onChange={e => setAddress(k, e.target.value)} />
          </Field>
        ))}
      </Section>

      {/* Financial */}
      <Section title="Financial">
        <Row>
          <Field label="Freight Credit Amount">
            <Input type="number" step="0.01" value={form.freight_credit_amount} onChange={e => set('freight_credit_amount', e.target.value)} />
          </Field>
          <Field label="Invoice Status">
            <select value={form.invoice_status} onChange={e => set('invoice_status', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {RECYCLING_INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Invoice Customer Amount">
            <Input type="number" step="0.01" value={form.invoice_customer_amount} onChange={e => set('invoice_customer_amount', e.target.value)} />
          </Field>
          <Field label="Invoice Payment Status">
            <select value={form.invoice_payment_status} onChange={e => set('invoice_payment_status', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {INVOICE_PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </Row>
      </Section>

      {/* PO Email Recipients */}
      <Section title="PO Email Recipients">
        {form.po_contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
            <Input placeholder="Name" value={c.name} onChange={e => updateContact(i, { name: e.target.value })} />
            <Input placeholder="Email" type="email" value={c.email} onChange={e => updateContact(i, { email: e.target.value })} />
            <select value={c.role} onChange={e => updateContact(i, { role: e.target.value as 'to'|'cc' })}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              <option value="to">To</option>
              <option value="cc">CC</option>
            </select>
            <button onClick={() => removeContact(i)} className="text-destructive hover:opacity-70">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addContact}>
          <Plus className="h-3.5 w-3.5 mr-1" />Add Contact
        </Button>
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <Field label="Credit/Freight Notes">
          <textarea value={form.po_notes} onChange={e => set('po_notes', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]" />
        </Field>
        <Field label="Misc Notes">
          <textarea value={form.misc_notes} onChange={e => set('misc_notes', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]" />
        </Field>
      </Section>

      {/* BOL */}
      <Section title="BOL">
        <Field label="BOL #">
          <Input value={form.bol_number} onChange={e => set('bol_number', e.target.value)} />
        </Field>
      </Section>

      <Button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-[#00205B] hover:bg-[#B88A44] text-white"
      >
        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Order
      </Button>
    </div>
  )
}
