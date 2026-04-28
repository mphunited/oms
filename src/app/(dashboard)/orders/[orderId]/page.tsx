'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, FileText, Truck, Copy, Mail, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { OrderChecklist } from '@/components/orders/order-checklist'
import { OrderSplitLoadsEditor } from '@/components/orders/order-split-loads-editor'
import { OrderCombobox } from '@/components/orders/order-combobox'
import { EditOrderSidebar } from '@/components/orders/edit-order-sidebar'
import { EditOrderAddresses } from '@/components/orders/edit-order-addresses'
import { EditOrderFreightSection } from '@/components/orders/edit-order-freight-section'
import { EditOrderIdentitySection } from '@/components/orders/edit-order-identity-section'
import { EditOrderDeleteModal } from '@/components/orders/edit-order-delete-modal'
import { useEditOrderForm } from '@/components/orders/use-edit-order-form'

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()

  const {
    order, loading, error, saving, saved,
    loads, setLoads, terms, setTerms,
    csrUserOptions, salespersonOptions, carriers, statusOptions,
    csrId, setCsrId, csr2Id, setCsr2Id,
    salespersonId, setSalespersonId,
    customerId, setCustomerId,
    vendorId, setVendorId,
    salesOrderNumber, setSalesOrderNumber,
    customerOptions, vendorOptions,
    emailingPo, emailingBol, emailingConfirmation,
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
    billToContacts, setBillToContacts,
    checklist, setChecklist,
    isAdmin,
    handleSave, handleDuplicate,
    handleEmailPoClick, handleEmailBolClick, handleEmailConfirmationClick,
    csrInitials,
  } = useEditOrderForm(orderId)

  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
          <button onClick={handleDuplicate} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors">
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </button>
          <a href={`/api/orders/${orderId}/po-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors">
            <FileText className="h-3.5 w-3.5" /> Download PO
          </a>
          <button onClick={handleEmailPoClick} disabled={emailingPo} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" /> {emailingPo ? 'Creating…' : 'Email PO'}
          </button>
          <a href={`/api/orders/${orderId}/bol-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors">
            <Truck className="h-3.5 w-3.5" /> Download BOL
          </a>
          <button onClick={handleEmailBolClick} disabled={emailingBol} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" /> {emailingBol ? 'Creating…' : 'Email BOL'}
          </button>
          <button onClick={handleEmailConfirmationClick} disabled={emailingConfirmation} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors disabled:opacity-50">
            <Mail className="h-3.5 w-3.5" /> {emailingConfirmation ? 'Creating…' : 'Email Confirmation'}
          </button>
        </div>
      </div>

      {/* Order Identity */}
      <EditOrderIdentitySection
        orderDate={orderDate}
        status={status}
        statusOptions={statusOptions}
        salespersonId={salespersonId}
        salespersonOptions={salespersonOptions}
        csrId={csrId}
        csr2Id={csr2Id}
        csrUserOptions={csrUserOptions}
        isBlind={isBlind}
        onOrderDateChange={setOrderDate}
        onStatusChange={setStatus}
        onSalespersonChange={setSalespersonId}
        onCsrChange={setCsrId}
        onCsr2Change={setCsr2Id}
        onIsBlindChange={setIsBlind}
      />

      <Separator className="bg-[#B88A44]" />

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer & Vendor</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <OrderCombobox
              options={customerOptions}
              value={customerId}
              onChange={v => setCustomerId(v)}
              placeholder="Choose customer"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <OrderCombobox
              options={vendorOptions}
              value={vendorId}
              onChange={v => {
                setVendorId(v)
                if (vendorOptions.find(o => o.id === v)?.name !== 'MPH United / Alliance Container -- Hillsboro, TX') {
                  setSalesOrderNumber('')
                }
              }}
              placeholder="Choose vendor"
            />
          </div>
          {vendorOptions.find(v => v.id === vendorId)?.name === 'MPH United / Alliance Container -- Hillsboro, TX' && (
            <div className="space-y-1.5">
              <Label>Sales Order #</Label>
              <Input value={salesOrderNumber} onChange={e => setSalesOrderNumber(e.target.value)} placeholder="Sales order number" />
            </div>
          )}
        </div>
      </section>

      <Separator className="bg-[#B88A44]" />

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

      <Separator className="bg-[#B88A44]" />

      {/* Freight & Logistics */}
      <EditOrderFreightSection
        carriers={carriers}
        freightCarrier={freightCarrier}
        freightCost={freightCost}
        freightToCustomer={freightToCustomer}
        additionalCosts={additionalCosts}
        appointmentTime={appointmentTime}
        appointmentNotes={appointmentNotes}
        onFreightCarrierChange={setFreightCarrier}
        onFreightCostChange={setFreightCost}
        onFreightToCustomerChange={setFreightToCustomer}
        onAdditionalCostsChange={setAdditionalCosts}
        onAppointmentTimeChange={setAppointmentTime}
        onAppointmentNotesChange={setAppointmentNotes}
      />

      <Separator className="bg-[#B88A44]" />

      {/* Addresses & Contacts */}
      <EditOrderAddresses
        shipTo={shipTo}
        billTo={billTo}
        customerContacts={customerContacts}
        billToContacts={billToContacts}
        onShipToChange={setShipTo}
        onBillToChange={setBillTo}
        onContactsChange={setCustomerContacts}
        onBillToContactsChange={setBillToContacts}
      />

      <Separator className="bg-[#B88A44]" />

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

      <Separator className="bg-[#B88A44]" />

      {/* Checklist */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CSR Checklist</h2>
        <OrderChecklist items={checklist} onChange={setChecklist} />
      </section>

      {isAdmin && (
        <section className="space-y-3 pt-4">
          <Separator className="bg-[#B88A44]" />
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Order
          </button>
        </section>
      )}

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

      {showDeleteModal && (
        <EditOrderDeleteModal
          orderId={orderId}
          orderNumber={order.order_number}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
