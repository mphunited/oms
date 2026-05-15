'use client'

import { useEffect } from 'react'
import { useEditIbcForm } from '@/lib/recycling/use-edit-ibc-form'
import { useRecyclingPoEmail } from '@/lib/recycling/use-recycling-po-email'
import { RECYCLING_STATUSES, RECYCLING_INVOICE_STATUSES, INVOICE_PAYMENT_STATUSES } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Mail, Download, Plus, Trash2 } from 'lucide-react'
import { stripMphPrefix } from '@/lib/utils/strip-mph-prefix'

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

export function EditIbcForm({
  id,
  onDirtyChange,
  onSavingChange,
  saveRef,
}: {
  id: string
  onDirtyChange?: (v: boolean) => void
  onSavingChange?: (v: boolean) => void
  saveRef?: React.MutableRefObject<(() => void) | null>
}) {
  const {
    form, set, setAddress, addContact, updateContact, removeContact,
    save, saving, loading, carriers, salespeople, csrList, customers, vendorList,
    isDirty, markDirty,
  } = useEditIbcForm(id)

  useEffect(() => { onDirtyChange?.(isDirty) }, [isDirty, onDirtyChange])
  useEffect(() => { onSavingChange?.(saving) }, [saving, onSavingChange])
  useEffect(() => { if (saveRef) saveRef.current = save })

  const { handleEmailPo, emailingPo } = useRecyclingPoEmail(id, form.order_number)

  function downloadPdf() {
    window.open(`/api/recycling-orders/${id}/po-pdf`, '_blank')
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Top button bar */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={save} disabled={saving} className="bg-[#00205B] hover:bg-[#B88A44] text-white">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />Save Order
        </Button>
        <Button onClick={handleEmailPo} disabled={emailingPo} variant="outline">
          {emailingPo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Mail className="h-4 w-4 mr-2" />Email PO
        </Button>
        <Button onClick={downloadPdf} variant="outline">
          <Download className="h-4 w-4 mr-2" />Download PO PDF
        </Button>
      </div>

      {/* Order Info */}
      <Section title="Order Info">
        <Row>
          <Field label="MPH PO #">
            <Input value={form.order_number} disabled className="bg-muted" />
          </Field>
          <Field label="Order Date">
            <Input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
          </Field>
        </Row>
        <Row>
          <Field label="Status">
            <select value={form.status} onChange={e => { set('status', e.target.value); markDirty() }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {RECYCLING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={form.flag} onCheckedChange={v => set('flag', v)} id="flag" />
            <Label htmlFor="flag" className="text-sm cursor-pointer text-red-600">Flag This Order</Label>
          </div>
        </Row>
      </Section>

      {/* IBC Source & Processing Facility */}
      <Section title="IBC Source & Processing Facility">
        <Row>
          <Field label="IBC Source">
            <select value={form.customer_id} onChange={e => { set('customer_id', e.target.value); markDirty() }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select customer…</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Processing Facility">
            <select value={form.vendor_id} onChange={e => { set('vendor_id', e.target.value); markDirty() }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select vendor…</option>
              {vendorList.map(v => <option key={v.id} value={v.id}>{stripMphPrefix(v.name)}</option>)}
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
          <Switch checked={form.is_blind_shipment} onCheckedChange={v => set('is_blind_shipment', v)} id="blind" />
          <Label htmlFor="blind" className="text-sm cursor-pointer">Blind Shipment</Label>
        </div>
      </Section>

      {/* Order Details */}
      <Section title="Order Details">
        <Row>
          <Field label="Customer PO">
            <Input value={form.customer_po} onChange={e => set('customer_po', e.target.value)} />
          </Field>
          <Field label="Qty">
            <Input type="number" step="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </Field>
        </Row>
        <Field label="Description">
          <Input value={form.description} onChange={e => { set('description', e.target.value); markDirty() }} />
        </Field>
        <Row>
          <Field label="Buy">
            <Input type="number" step="0.01" value={form.buy} onChange={e => set('buy', e.target.value)} />
          </Field>
          <Field label="Sell">
            <Input type="number" step="0.01" value={form.sell} onChange={e => set('sell', e.target.value)} />
          </Field>
        </Row>
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
        <Field label="QB Invoice Number">
          <Input value={form.qb_invoice_number} onChange={e => set('qb_invoice_number', e.target.value)} />
        </Field>
        <Field label="Credit/Freight Notes">
          <textarea value={form.po_notes} onChange={e => set('po_notes', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]" />
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
        <Field label="BOL #">
          <Input value={form.bol_number} onChange={e => set('bol_number', e.target.value)} />
        </Field>
      </Section>

      {/* Ship To */}
      <Section title="Ship To / Pick-Up Location">
        {(['name','street','city','state','zip'] as const).map(k => (
          <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
            <Input value={form.ship_to[k]} onChange={e => setAddress(k, e.target.value)} />
          </Field>
        ))}
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
        <Field label="Misc Notes">
          <textarea value={form.misc_notes} onChange={e => { set('misc_notes', e.target.value); markDirty() }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px]" />
        </Field>
      </Section>
    </div>
  )
}
