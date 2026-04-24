'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileText, Truck, Copy, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { OrderChecklist } from '@/components/orders/order-checklist'
import { OrderSplitLoadsEditor } from '@/components/orders/order-split-loads-editor'
import { OrderCombobox } from '@/components/orders/order-combobox'
import { EditOrderSidebar } from '@/components/orders/edit-order-sidebar'
import { EditOrderAddresses } from '@/components/orders/edit-order-addresses'
import { useEditOrderForm } from '@/components/orders/use-edit-order-form'

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()

  const {
    order, loading, error, saving, saved,
    loads, setLoads, terms, setTerms,
    csrUserOptions, salespersonOptions, carriers, statusOptions,
    csrId, setCsrId, csr2Id, setCsr2Id,
    salespersonId, setSalespersonId,
    emailingPo, emailingBol,
    orderDate, setOrderDate,
    status, setStatus,
    customerPo, setCustomerPo,
    freightCarrier, setFreightCarrier,
    shipDate, setShipDate,
    wantedDate, setWantedDate,
    freightCost, setFreightCost,
    freightToCustomer, setFreightToCustomer,
    additionalCosts, setAdditionalCosts,
    appointmentTime, setAppointmentTime,
    appointmentNotes, setAppointmentNotes,
    poNotes, setPoNotes,
    freightInvoiceNotes, setFreightInvoiceNotes,
    miscNotes, setMiscNotes,
    flag, setFlag,
    isBlind, setIsBlind,
    isRevised, setIsRevised,
    invoicePaymentStatus, setInvoicePaymentStatus,
    qbInvoiceNumber, setQbInvoiceNumber,
    shipTo, setShipTo,
    billTo, setBillTo,
    customerContacts, setCustomerContacts,
    checklist, setChecklist,
    handleSave, handleDuplicate,
    handleEmailPoClick, handleEmailBolClick,
    csrInitials,
  } = useEditOrderForm(orderId)

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (error)   return <p className="p-6 text-sm text-destructive">Error: {error}</p>
  if (!order)  return null

  return (
    <div className="p-6">

      {/* Page title */}
      <h1 className="text-2xl font-semibold mb-6">Edit Order</h1>

      <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0 space-y-6">

      {/* Header — order number + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/orders" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-lg font-mono font-semibold">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">
              {order.customer_name ?? '—'}{order.vendor_name ? ` · ${order.vendor_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDuplicate} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </button>
          <a href={`/api/orders/${orderId}/po-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <FileText className="h-3.5 w-3.5" /> Download PO
          </a>
          <button onClick={handleEmailPoClick} disabled={emailingPo} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" /> {emailingPo ? 'Creating…' : 'Email PO'}
          </button>
          <a href={`/api/orders/${orderId}/bol-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
            <Truck className="h-3.5 w-3.5" /> Download BOL
          </a>
          <button onClick={handleEmailBolClick} disabled={emailingBol} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" /> {emailingBol ? 'Creating…' : 'Email BOL'}
          </button>
        </div>
      </div>

      {/* Order Identity */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Order Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Order Date</Label>
            <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => { if (v) setStatus(v) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Salesperson</Label>
            <OrderCombobox
              options={salespersonOptions}
              value={salespersonId}
              onChange={v => setSalespersonId(v)}
              placeholder="Choose salesperson"
            />
          </div>
          <div className="space-y-1.5">
            <Label>CSR</Label>
            <Select value={csrId} onValueChange={v => setCsrId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Select CSR">
                {csrId ? (csrUserOptions.find(u => u.id === csrId)?.name ?? csrId) : 'Select CSR'}
              </SelectValue></SelectTrigger>
              <SelectContent>{csrUserOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>CSR 2 (optional)</Label>
            <Select value={csr2Id ?? 'none'} onValueChange={v => setCsr2Id(v === 'none' ? null : (v ?? null))}>
              <SelectTrigger><SelectValue placeholder="None">
                {csr2Id && csr2Id !== 'none' ? (csrUserOptions.find(u => u.id === csr2Id)?.name ?? csr2Id) : 'None'}
              </SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {csrUserOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.name ?? u.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Customer PO</Label>
            <Input value={customerPo} onChange={e => setCustomerPo(e.target.value)} placeholder="PO number" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Switch id="is_blind" checked={isBlind} onCheckedChange={setIsBlind} />
            <Label htmlFor="is_blind" className="cursor-pointer">Blind Shipment</Label>
          </div>
        </div>
      </section>

      <Separator />

      {/* Customer & Vendor — read-only display, not editable on edit page */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer & Vendor</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Customer: </span>{order.customer_name ?? '—'}</div>
          <div><span className="text-muted-foreground">Vendor: </span>{order.vendor_name ?? '—'}</div>
        </div>
      </section>

      <Separator />

      {/* Line Items */}
      <section>
        <OrderSplitLoadsEditor
          loads={loads}
          orderPo={order.order_number}
          orderCustomerPo={customerPo}
          orderShipDate={shipDate}
          orderWantedDate={wantedDate}
          terms={terms}
          csrInitials={csrInitials}
          onTermsChange={setTerms}
          onChange={setLoads}
        />
      </section>

      <Separator />

      {/* Freight & Logistics */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Freight & Logistics</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Freight Carrier</Label>
            <Select value={freightCarrier} onValueChange={v => { if (v) setFreightCarrier(v) }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select carrier" /></SelectTrigger>
              <SelectContent>{carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
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
        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-1.5">
            <Label>Appointment Notes</Label>
            <Input value={appointmentNotes} onChange={e => setAppointmentNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </section>

      <Separator />

      {/* Addresses & Contacts */}
      <EditOrderAddresses
        shipTo={shipTo}
        billTo={billTo}
        customerContacts={customerContacts}
        onShipToChange={setShipTo}
        onBillToChange={setBillTo}
        onContactsChange={setCustomerContacts}
      />

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

      <div className="pb-8" />
      </div>

      <EditOrderSidebar
        loads={loads}
        freightCost={freightCost}
        freightToCustomer={freightToCustomer}
        additionalCosts={additionalCosts}
        saving={saving}
        saved={saved}
        flag={flag}
        isBlind={isBlind}
        isRevised={isRevised}
        invoicePaymentStatus={invoicePaymentStatus}
        qbInvoiceNumber={qbInvoiceNumber}
        onFlagChange={setFlag}
        onIsBlindChange={setIsBlind}
        onIsRevisedChange={setIsRevised}
        onInvoiceStatusChange={setInvoicePaymentStatus}
        onQbInvoiceNumberChange={setQbInvoiceNumber}
        onSave={handleSave}
      />
      </div>
    </div>
  )
}
