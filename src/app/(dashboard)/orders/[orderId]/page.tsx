'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileText, Truck, Copy, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrderChecklist, type ChecklistItem } from '@/components/orders/order-checklist'
import { OrderSplitLoadsEditor, type SplitLoadValue } from '@/components/orders/order-split-loads-editor'
import { ORDER_STATUSES, ORDER_TYPES, INVOICE_PAYMENT_STATUSES, COMMISSION_STATUSES, TERMS_VALUES } from '@/lib/db/schema'
import { toast } from 'sonner'
import { getMailToken } from '@/lib/email/msal-client'
import { createDraft, attachFileToDraft, openDraft } from '@/lib/email/graph-mail'
import { buildPoEmail, type OrderWithRelations } from '@/lib/email/build-po-email'
import { getUserSignature } from '@/lib/email/get-user-signature'
import { formatDate } from '@/lib/utils/format-date'

type AddressValue = {
  name: string
  street: string
  city: string
  state: string
  zip: string
  phone: string
  shipping_notes: string
}

type CustomerContact = {
  name: string
  email: string
}

type OrderDetail = {
  id: string
  order_number: string
  order_date: string | null
  order_type: string | null
  status: string
  customer_id: string
  vendor_id: string | null
  salesperson_id: string | null
  csr_id: string | null
  customer_po: string | null
  freight_carrier: string | null
  ship_date: string | null
  wanted_date: string | null
  freight_cost: string | null
  freight_to_customer: string | null
  additional_costs: string
  terms: string | null
  appointment_time: string | null
  appointment_notes: string | null
  po_notes: string | null
  freight_invoice_notes: string | null
  misc_notes: string | null
  flag: boolean
  is_blind_shipment: boolean
  is_revised: boolean
  invoice_payment_status: string
  commission_status: string
  qb_invoice_number: string | null
  ship_to: AddressValue | null
  bill_to: AddressValue | null
  customer_contacts: CustomerContact[] | null
  checklist: ChecklistItem[] | null
  split_loads: SplitLoadValue[]
  sales_order_number: string | null
  customer_name: string | null
  vendor_name: string | null
  salesperson_name: string | null
  csr_name: string | null
}

type VendorRow = {
  name: string
  po_contacts: unknown
  bol_contacts: unknown
  address: unknown
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function emptyAddress(): AddressValue {
  return { name: '', street: '', city: '', state: '', zip: '', phone: '', shipping_notes: '' }
}

function AddressBlock({
  label,
  value,
  onChange,
}: {
  label: string
  value: AddressValue | null | undefined
  onChange: (v: AddressValue) => void
}) {
  const addr = value ?? emptyAddress()
  const u = (field: keyof AddressValue, val: string) => onChange({ ...addr, [field]: val })
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Name / Company</Label>
          <Input value={addr.name} onChange={e => u('name', e.target.value)} placeholder="Name or company" />
        </div>
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Street</Label>
          <Input value={addr.street} onChange={e => u('street', e.target.value)} placeholder="Street address" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={addr.city} onChange={e => u('city', e.target.value)} placeholder="City" />
        </div>
        <div className="col-span-1 space-y-1.5">
          <Label className="text-xs">State</Label>
          <Input value={addr.state} onChange={e => u('state', e.target.value)} placeholder="ST" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">ZIP</Label>
          <Input value={addr.zip} onChange={e => u('zip', e.target.value)} placeholder="00000" />
        </div>
        <div className="col-span-3 space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input value={addr.phone} onChange={e => u('phone', e.target.value)} placeholder="Phone" />
        </div>
        <div className="col-span-6 space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Input value={addr.shipping_notes} onChange={e => u('shipping_notes', e.target.value)} placeholder="Dock hours, special instructions…" />
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDuplicate = searchParams.get('duplicate') === '1'

  const [order, setOrder]     = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [emailingPo, setEmailingPo] = useState(false)
  const [emailingBol, setEmailingBol] = useState(false)

  // Form state
  const [orderDate, setOrderDate]           = useState('')
  const [orderType, setOrderType]           = useState('')
  const [status, setStatus]                 = useState('')
  const [customerPo, setCustomerPo]         = useState('')
  const [freightCarrier, setFreightCarrier] = useState('')
  const [shipDate, setShipDate]             = useState('')
  const [wantedDate, setWantedDate]         = useState('')
  const [freightCost, setFreightCost]       = useState('')
  const [freightToCustomer, setFreightToCustomer] = useState('')
  const [additionalCosts, setAdditionalCosts]     = useState('0')
  const [terms, setTerms]                   = useState('')
  const [appointmentTime, setAppointmentTime]     = useState('')
  const [appointmentNotes, setAppointmentNotes]   = useState('')
  const [poNotes, setPoNotes]               = useState('')
  const [freightInvoiceNotes, setFreightInvoiceNotes] = useState('')
  const [miscNotes, setMiscNotes]           = useState('')
  const [flag, setFlag]                     = useState(false)
  const [isBlind, setIsBlind]               = useState(false)
  const [isRevised, setIsRevised]           = useState(false)
  const [invoicePaymentStatus, setInvoicePaymentStatus] = useState('Not Invoiced')
  const [commissionStatus, setCommissionStatus]         = useState('Not Eligible')
  const [qbInvoiceNumber, setQbInvoiceNumber]           = useState('')
  const [shipTo, setShipTo]                 = useState<AddressValue | null>(null)
  const [billTo, setBillTo]                 = useState<AddressValue | null>(null)
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([])
  const [checklist, setChecklist]           = useState<ChecklistItem[]>([])
  const [splitLoads, setSplitLoads]         = useState<SplitLoadValue[]>([])

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<OrderDetail> })
      .then(data => {
        setOrder(data)
        setOrderDate(data.order_date ?? '')
        setOrderType(data.order_type ?? '')
        setStatus(data.status)
        setCustomerPo(data.customer_po ?? '')
        setFreightCarrier(data.freight_carrier ?? '')
        setShipDate(data.ship_date ?? '')
        setWantedDate(data.wanted_date ?? '')
        setFreightCost(data.freight_cost ?? '')
        setFreightToCustomer(data.freight_to_customer ?? '')
        setAdditionalCosts(data.additional_costs ?? '0')
        setTerms(data.terms ?? '')
        setAppointmentTime(data.appointment_time ?? '')
        setAppointmentNotes(data.appointment_notes ?? '')
        setPoNotes(data.po_notes ?? '')
        setFreightInvoiceNotes(data.freight_invoice_notes ?? '')
        setMiscNotes(data.misc_notes ?? '')
        setFlag(data.flag)
        setIsBlind(data.is_blind_shipment)
        setIsRevised(data.is_revised)
        setInvoicePaymentStatus(data.invoice_payment_status)
        setCommissionStatus(data.commission_status)
        setQbInvoiceNumber(data.qb_invoice_number ?? '')
        setShipTo(data.ship_to)
        setBillTo(data.bill_to)
        setCustomerContacts((data.customer_contacts as CustomerContact[]) ?? [])
        setChecklist((data.checklist as ChecklistItem[]) ?? [])
        setSplitLoads(data.split_loads.map(l => ({
          id: l.id,
          description: l.description ?? '',
          part_number: l.part_number ?? '',
          qty: l.qty ?? '',
          buy: l.buy ?? '',
          sell: l.sell ?? '',
          bottle_cost: l.bottle_cost ?? '',
          bottle_qty: l.bottle_qty ?? '',
          mph_freight_bottles: l.mph_freight_bottles ?? '',
          order_number_override: l.order_number_override ?? '',
        })))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [orderId])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_date: orderDate || null,
          order_type: orderType || null,
          status,
          customer_po: customerPo || null,
          freight_carrier: freightCarrier || null,
          ship_date: shipDate || null,
          wanted_date: wantedDate || null,
          freight_cost: freightCost || null,
          freight_to_customer: freightToCustomer || null,
          additional_costs: additionalCosts || '0',
          terms: terms || null,
          appointment_time: appointmentTime || null,
          appointment_notes: appointmentNotes || null,
          po_notes: poNotes || null,
          freight_invoice_notes: freightInvoiceNotes || null,
          misc_notes: miscNotes || null,
          flag,
          is_blind_shipment: isBlind,
          is_revised: isRevised,
          invoice_payment_status: invoicePaymentStatus,
          commission_status: commissionStatus,
          qb_invoice_number: qbInvoiceNumber || null,
          ship_to: shipTo,
          bill_to: billTo,
          customer_contacts: customerContacts,
          checklist,
          split_loads: splitLoads,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Save failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate() {
    if (!order) return
    try {
      const res = await fetch(`/api/orders/duplicate/${orderId}`, { method: 'POST' })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json() as { id: string }
      toast.success('Order duplicated successfully')
      router.push(`/orders/${data.id}`)
    } catch (err) {
      toast.error('Failed to duplicate order: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  async function handleEmailPoClick() {
    if (!order) return
    setEmailingPo(true)
    const toastId = toast.loading('Creating draft…')
    try {
      let vendor: VendorRow | null = null
      if (order.vendor_id) {
        const res = await fetch(`/api/vendors/${order.vendor_id}`)
        if (res.ok) vendor = await res.json() as VendorRow
      }
      const poContacts = (vendor?.po_contacts ?? []) as Array<{ name: string; email: string; is_primary?: boolean }>
      const primary = poContacts.find(c => c.is_primary) ?? poContacts[0] ?? null
      const greetingName = primary ? (primary.name.split(' ')[0] ?? primary.name) : (vendor?.name ?? '')
      const vendorAddress = vendor?.address as { city?: string; state?: string } | null
      const orderData: OrderWithRelations = {
        order_number: order.order_number,
        is_blind_shipment: order.is_blind_shipment,
        customer_po: order.customer_po,
        sales_order_number: order.sales_order_number,
        freight_carrier: order.freight_carrier,
        ship_date: shipDate || order.ship_date,
        ship_to: shipTo,
        po_notes: poNotes || null,
        vendor: { name: order.vendor_name ?? '', address: vendorAddress, po_contacts: poContacts },
        customer: { name: order.customer_name ?? '' },
        order_split_loads: splitLoads.map(l => ({
          description: l.description || null,
          part_number: l.part_number || null,
          qty: l.qty || null,
          sell: l.sell || null,
          order_number_override: l.order_number_override || null,
        })),
      }
      const { subject, bodyHtml, to, cc } = buildPoEmail([orderData], greetingName)
      const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
      const pdfRes = await fetch(`/api/orders/${orderId}/po-pdf`)
      if (!pdfRes.ok) throw new Error('Failed to fetch PO PDF')
      const base64 = await blobToBase64(await pdfRes.blob())
      const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
      await attachFileToDraft(token, messageId, `MPH PO ${order.order_number}.pdf`, base64)
      toast.success('Draft created — opening Outlook', { id: toastId })
      openDraft(webLink)
    } catch (err) {
      toast.error('Failed to create draft: ' + (err instanceof Error ? err.message : String(err)), { id: toastId })
    } finally {
      setEmailingPo(false)
    }
  }

  async function handleEmailBolClick() {
    if (!order) return
    setEmailingBol(true)
    const toastId = toast.loading('Creating draft…')
    try {
      let vendor: VendorRow | null = null
      if (order.vendor_id) {
        const res = await fetch(`/api/vendors/${order.vendor_id}`)
        if (res.ok) vendor = await res.json() as VendorRow
      }
      const contacts = (vendor?.bol_contacts ?? []) as Array<{ name: string; email: string; is_primary?: boolean }>
      const primary = contacts.find(c => c.is_primary) ?? contacts[0] ?? null
      const others = contacts.filter(c => c !== primary)
      const to = primary?.email ? [primary.email] : []
      const cc = others.map(c => c.email).filter((e): e is string => Boolean(e))

      const vendorName = vendor?.name ?? order.vendor_name ?? ''
      const greetingName = vendorName
      const shipToLine = shipTo
        ? [shipTo.name, [shipTo.city, shipTo.state].filter(Boolean).join(', ')].filter(Boolean).join(', ')
        : '—'
      const shipDateFmt = formatDate(shipDate || order.ship_date)

      const subject = `MPH United BOL ${order.order_number} -- ${vendorName} | Ship ${shipDateFmt}`

      const bodyHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;max-width:700px;line-height:1.6;">
  <p style="margin:0 0 16px;">Hello ${greetingName},</p>
  <p style="margin:0 0 16px;">Please find attached the Bill of Lading for MPH United order ${order.order_number}, shipping to ${shipToLine} on ${shipDateFmt}.</p>
  <p style="margin:0 0 24px;">Please confirm receipt at your earliest convenience.</p>
  <p style="margin:0;">Thank you,<br/>MPH United</p>
</div>`

      const [token, signature] = await Promise.all([getMailToken(), getUserSignature()])
      const pdfRes = await fetch(`/api/orders/${orderId}/bol-pdf`)
      if (!pdfRes.ok) throw new Error('Failed to fetch BOL PDF')
      const base64 = await blobToBase64(await pdfRes.blob())
      const { id: messageId, webLink } = await createDraft(token, { to, cc, subject, bodyHtml, signature })
      await attachFileToDraft(token, messageId, `MPH BOL ${order.order_number}.pdf`, base64)
      toast.success('Draft created — opening Outlook', { id: toastId })
      openDraft(webLink)
    } catch (err) {
      toast.error('Failed to create draft: ' + (err instanceof Error ? err.message : String(err)), { id: toastId })
    } finally {
      setEmailingBol(false)
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (error)   return <p className="p-6 text-sm text-destructive">Error: {error}</p>
  if (!order)  return null

  return (
    <div className="p-6 max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold font-mono">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              {order.customer_name ?? '—'}{order.vendor_name ? ` · ${order.vendor_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <a
            href={`/api/orders/${orderId}/po-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Download PO
          </a>
          <button
            onClick={handleEmailPoClick}
            disabled={emailingPo}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            {emailingPo ? 'Creating…' : 'Email PO'}
          </button>
          <a
            href={`/api/orders/${orderId}/bol-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Truck className="h-3.5 w-3.5" />
            Download BOL
          </a>
          <button
            onClick={handleEmailBolClick}
            disabled={emailingBol}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            {emailingBol ? 'Creating…' : 'Email BOL'}
          </button>
        </div>
      </div>

      {/* Order Identity */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Order Identity</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Order Date</Label>
            <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => { if (value !== null) setStatus(value); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Order Type</Label>
            <Select value={orderType} onValueChange={(value) => { if (value !== null) setOrderType(value); }}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Customer PO</Label>
            <Input value={customerPo} onChange={e => setCustomerPo(e.target.value)} placeholder="PO number" />
          </div>
          <div className="space-y-1.5">
            <Label>Freight Carrier</Label>
            <Input value={freightCarrier} onChange={e => setFreightCarrier(e.target.value)} placeholder="Carrier name" />
          </div>
          <div className="space-y-1.5">
            <Label>Terms</Label>
            <Select value={terms} onValueChange={(value) => { if (value !== null) setTerms(value); }}>
              <SelectTrigger><SelectValue placeholder="PPD / PPA / FOB" /></SelectTrigger>
              <SelectContent>
                {TERMS_VALUES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ship Date</Label>
            <Input type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Wanted Date</Label>
            <Input type="date" value={wantedDate} onChange={e => setWantedDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Appointment Time</Label>
            <Input value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} placeholder="e.g. 9:00 AM – 10:00 AM" />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label>Appointment Notes</Label>
            <Input value={appointmentNotes} onChange={e => setAppointmentNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </section>

      <Separator />

      {/* Freight & Costs */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Freight & Costs</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>MPH Freight Cost</Label>
            <Input type="number" min="0" step="0.01" value={freightCost} onChange={e => setFreightCost(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Customer Freight Cost</Label>
            <Input type="number" min="0" step="0.01" value={freightToCustomer} onChange={e => setFreightToCustomer(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>Additional Costs</Label>
            <Input type="number" min="0" step="0.01" value={additionalCosts} onChange={e => setAdditionalCosts(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </section>

      <Separator />

      {/* Line Items */}
      <section>
        <OrderSplitLoadsEditor
          loads={splitLoads}
          orderType={orderType}
          onChange={setSplitLoads}
        />
      </section>

      <Separator />

      {/* Addresses */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Addresses</h2>
        <div className="grid grid-cols-2 gap-6">
          <AddressBlock label="Ship To" value={shipTo} onChange={setShipTo} />
          <AddressBlock label="Bill To" value={billTo} onChange={setBillTo} />
        </div>
      </section>

      <Separator />

      {/* Customer Contacts */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer Contacts</h2>
        {customerContacts.map((contact, index) => (
          <div key={index} className="grid grid-cols-5 gap-2 rounded-md border p-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={contact.name}
                onChange={e => setCustomerContacts(prev => prev.map((c, i) => i === index ? { ...c, name: e.target.value } : c))}
                placeholder="Full name"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={contact.email}
                onChange={e => setCustomerContacts(prev => prev.map((c, i) => i === index ? { ...c, email: e.target.value } : c))}
                placeholder="email@company.com"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setCustomerContacts(prev => prev.filter((_, i) => i !== index))}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCustomerContacts(prev => [...prev, { name: '', email: '' }])}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          + Add Contact
        </button>
      </section>

      <Separator />

      {/* Notes */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>PO Notes</Label>
            <Textarea value={poNotes} onChange={e => setPoNotes(e.target.value)} placeholder="Appears on the purchase order" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Freight / Invoice Notes</Label>
            <Textarea value={freightInvoiceNotes} onChange={e => setFreightInvoiceNotes(e.target.value)} placeholder="Delivery, invoicing, or carrier instructions" rows={3} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Misc Notes</Label>
            <Textarea value={miscNotes} onChange={e => setMiscNotes(e.target.value)} placeholder="Internal notes" rows={3} />
          </div>
        </div>
      </section>

      <Separator />

      {/* Checklist */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CSR Checklist</h2>
        <OrderChecklist items={checklist} onChange={setChecklist} />
      </section>

      <Separator />

      {/* Status flags & invoice */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status & Invoicing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Invoice Payment Status</Label>
            <Select value={invoicePaymentStatus} onValueChange={(value) => { if (value !== null) setInvoicePaymentStatus(value); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVOICE_PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Commission Status</Label>
            <Select value={commissionStatus} onValueChange={(value) => { if (value !== null) setCommissionStatus(value); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMISSION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>QB Invoice Number</Label>
            <Input value={qbInvoiceNumber} onChange={e => setQbInvoiceNumber(e.target.value)} placeholder="QuickBooks invoice #" />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch id="flag" checked={flag} onCheckedChange={setFlag} />
            <Label htmlFor="flag" className="cursor-pointer">Flagged</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_blind" checked={isBlind} onCheckedChange={setIsBlind} />
            <Label htmlFor="is_blind" className="cursor-pointer">Blind Shipment</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="is_revised" checked={isRevised} onCheckedChange={setIsRevised} />
            <Label htmlFor="is_revised" className="cursor-pointer">Revised PO</Label>
          </div>
        </div>
      </section>

      <Separator />

      {/* Save */}
      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>}
      </div>

    </div>
  )
}