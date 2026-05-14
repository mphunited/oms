'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, FileText, Truck, Copy, Link2, Mail, Trash2 } from 'lucide-react'
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
import { toast } from 'sonner'
import { useEditOrderForm } from '@/components/orders/use-edit-order-form'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { formatVendorName } from '@/lib/utils/format-vendor-name'
import { useGlobalContacts } from '@/components/orders/use-global-contacts'
import { NewContactPrompt } from '@/components/orders/new-contact-prompt'
import type { NewContactEntry } from '@/components/orders/new-contact-prompt'
import { UnsavedChangesBanner } from '@/components/shared/unsaved-changes-banner'

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const router = useRouter()

  const {
    order, loading, error, saving, saved,
    loads, setLoads, terms, setTerms,
    csrUserOptions, salespersonOptions, carriers, statusOptions,
    csrId, setCsrId, csr2Id, setCsr2Id,
    salespersonId, setSalespersonId,
    customerId, setCustomerId,
    vendorId, setVendorId,
    customerOptions, vendorOptions,
    emailingPo, emailingBol, emailingConfirmation,
    orderDate, setOrderDate,
    status, setStatus,
    customerPo, setCustomerPo: _setCustomerPo,
    freightCarrier, setFreightCarrier,
    shipDate, setShipDate: _setShipDate,
wantedDate, setWantedDate: _setWantedDate,
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
    isSales,
    groupData,
    isDirty, markDirty,
    handleSave, handleDuplicate,
    handleEmailPoClick, handleEmailBolClick, handleEmailConfirmationClick,
    csrInitials,
  } = useEditOrderForm(orderId)

  useUnsavedChanges(isDirty)

  const { confirmationContacts, billToContacts: globalBillToContacts, findNewContacts } = useGlobalContacts()
  const [pendingNewContacts, setPendingNewContacts] = useState<NewContactEntry[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  async function onSave() {
    const ok = await handleSave()
    if (ok) {
      const newContacts = [
        ...findNewContacts(customerContacts, confirmationContacts, 'CONFIRMATION'),
        ...findNewContacts(billToContacts, globalBillToContacts, 'BILL_TO'),
      ]
      if (newContacts.length > 0) setPendingNewContacts(newContacts)
    }
  }

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (error)   return <p className="p-6 text-sm text-destructive">Error: {error}</p>
  if (!order)  return null

  return (
    <div className="p-6">

      {/* Page title */}
      <h1 className="text-2xl font-semibold mb-6">{isSales ? 'View Order' : 'Edit Order'}</h1>

      <div className="flex gap-6 items-start">
      <div className={`flex-1 min-w-0 space-y-6${isSales ? ' pointer-events-none opacity-70 select-none' : ''}`}>

      {/* Header — order number + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return
              router.push('/orders')
            }}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-lg font-mono font-semibold">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">
              {order.customer_name ?? '—'}{order.vendor_name ? ` · ${order.vendor_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isSales && (
            <button onClick={handleDuplicate} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          )}
          <a href={`/api/orders/${orderId}/po-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors">
            <FileText className="h-3.5 w-3.5" /> Download PO
          </a>
          {!isSales && (
            <button onClick={handleEmailPoClick} disabled={emailingPo} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors disabled:opacity-50">
              <Mail className="h-3.5 w-3.5" /> {emailingPo ? 'Creating…' : 'Email PO'}
            </button>
          )}
          <a href={`/api/orders/${orderId}/bol-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors">
            <Truck className="h-3.5 w-3.5" /> Download BOL
          </a>
          {!isSales && (
            <button onClick={handleEmailBolClick} disabled={emailingBol} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors disabled:opacity-50">
              <Mail className="h-3.5 w-3.5" /> {emailingBol ? 'Creating…' : 'Email BOL'}
            </button>
          )}
          {!isSales && (
            <button onClick={handleEmailConfirmationClick} disabled={emailingConfirmation} className="inline-flex items-center gap-2 rounded-md bg-[#00205B] text-white px-3 py-1.5 text-sm hover:bg-[#00205B]/90 transition-colors disabled:opacity-50">
              <Mail className="h-3.5 w-3.5" /> {emailingConfirmation ? 'Creating…' : 'Email Confirmation'}
            </button>
          )}
        </div>
      </div>

      <UnsavedChangesBanner isDirty={isDirty} onSave={onSave} saving={saving} />

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
        onOrderDateChange={v => { markDirty(); setOrderDate(v) }}
        onStatusChange={v => { markDirty(); setStatus(v) }}
        onSalespersonChange={setSalespersonId}
        onCsrChange={setCsrId}
        onCsr2Change={setCsr2Id}
        onIsBlindChange={setIsBlind}
      />

      <Separator className="bg-[#B88A44]" />

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
          <h3 className="text-[13px] font-semibold text-[#171717] tracking-normal">Customer & vendor</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <OrderCombobox
              options={customerOptions}
              value={customerId}
              onChange={v => { markDirty(); setCustomerId(v) }}
              placeholder="Choose customer"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <OrderCombobox
              options={vendorOptions.map(v => ({ ...v, name: formatVendorName(v.name) }))}
              value={vendorId}
              onChange={v => {
                markDirty()
                setVendorId(v)
              }}
              placeholder="Choose vendor"
            />
          </div>
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
        globalConfirmationContacts={confirmationContacts}
        globalBillToContacts={globalBillToContacts}
      />

      <Separator className="bg-[#B88A44]" />

      {/* Notes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
          <h3 className="text-[13px] font-semibold text-[#171717] tracking-normal">Notes</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>PO Notes</Label>
            <Textarea value={poNotes} onChange={e => { markDirty(); setPoNotes(e.target.value) }} placeholder="Appears on the purchase order" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Freight / Invoice Notes</Label>
            <Textarea value={freightInvoiceNotes} onChange={e => setFreightInvoiceNotes(e.target.value)} placeholder="Delivery, invoicing, or carrier instructions" rows={3} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Misc Notes</Label>
            <Textarea value={miscNotes} onChange={e => { markDirty(); setMiscNotes(e.target.value) }} placeholder="Internal notes" rows={3} />
          </div>
        </div>
      </section>

      <Separator className="bg-[#B88A44]" />

      {/* Checklist */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
          <h3 className="text-[13px] font-semibold text-[#171717] tracking-normal">CSR checklist</h3>
        </div>
        <OrderChecklist items={checklist} onChange={setChecklist} />
      </section>

      {/* Multi-Ship-To Group */}
      {order.group_id && groupData && (
        <>
          <Separator className="bg-[#B88A44]" />
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-0.5 h-5 rounded-full bg-[#1a2744]" />
              <h3 className="text-[13px] font-semibold text-[#171717] tracking-normal">Multi-ship-to group</h3>
            </div>
            <div className="rounded-md border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-[#0C447C]" />
                <span className="text-sm font-medium">Group PO: <span className="font-mono">{groupData.group_po_number}</span></span>
              </div>
              <ul className="space-y-1">
                {groupData.orders.map(o => (
                  <li key={o.id} className="text-sm">
                    <a href={`/orders/${o.id}`} className="text-[#00205B] hover:underline font-mono">
                      {o.order_number}
                    </a>
                    {o.customer_name && (
                      <span className="text-muted-foreground ml-2">— {o.customer_name}</span>
                    )}
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Remove this group? All orders will revert to standalone POs.')) return
                    const res = await fetch(`/api/order-groups/${groupData.id}`, { method: 'DELETE' })
                    if (res.ok) {
                      toast.success('Group removed')
                      window.location.reload()
                    } else {
                      toast.error('Failed to remove group')
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  Ungroup
                </button>
              )}
            </div>
          </section>
        </>
      )}

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
        onSave={onSave}
        readOnly={isSales}
      />
      </div>

      <NewContactPrompt pending={pendingNewContacts} onClear={() => setPendingNewContacts([])} />

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
