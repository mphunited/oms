'use client'

import { useWatch } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { getMailToken } from '@/lib/email/msal-client'
import { createDraft, attachFileToDraft, openDraft } from '@/lib/email/graph-mail'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { OrderSplitLoadsEditor } from '@/components/orders/order-split-loads-editor'
import { OrderMarginCard } from '@/components/orders/order-margin-card'
import { OrderCombobox } from '@/components/orders/order-combobox'
import { OrderAddressFields } from '@/components/orders/order-address-fields'
import { OrderContactFields } from '@/components/orders/order-contact-fields'
import { useNewOrderForm } from '@/components/orders/use-new-order-form'
import { matchOrderType } from '@/lib/orders/description-type-map'
import { emptyLoad } from '@/lib/orders/order-form-schema'
import type { OrderFormValues } from '@/lib/orders/order-form-schema'

export function NewOrderForm() {
  const router = useRouter()
  const {
    form, loads, setLoads, savedOrder, setSavedOrder, isSubmitting, submitError,
    isAdmin, canUseManualPO, csrInitials, customers, vendors, salespersonOptions, csrOptions,
    carriers, statusOptions, onSubmit,
  } = useNewOrderForm()

  const [notesOpen, setNotesOpen] = useState(true)
  const [orderTypeManuallySet, setOrderTypeManuallySet] = useState(false)
  const [emailingPO, setEmailingPO] = useState(false)
  const [isManualMode, setIsManualMode] = useState(false)
  const [manualPONumber, setManualPONumber] = useState('')
  const [manualPOError, setManualPOError] = useState<string | null>(null)

  const watchedValues = useWatch({ control: form.control })

  const firstDescription = loads[0]?.description ?? ''
  useEffect(() => {
    if (orderTypeManuallySet) return
    const matched = matchOrderType(firstDescription)
    if (matched) {
      form.setValue('order_type', matched, { shouldValidate: true })
      setLoads(prev => prev.map((l, i) => i === 0 ? { ...l, order_type: matched } : l))
    }
  }, [firstDescription, orderTypeManuallySet]) // eslint-disable-line react-hooks/exhaustive-deps

  const contactEmails = (watchedValues.customer_contacts ?? [])
    .map(c => c.email?.trim()).filter((e): e is string => !!e && e.length > 0)

  async function handleEmailPO() {
    if (!savedOrder) return
    setEmailingPO(true)
    try {
      const token = await getMailToken()
      const pdfRes = await fetch(`/api/orders/${savedOrder.id}/po-pdf`)
      if (!pdfRes.ok) throw new Error(`PDF fetch failed (${pdfRes.status})`)
      const pdfBlob = await pdfRes.blob()
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(pdfBlob)
      })
      const draft = await createDraft(token, { to: contactEmails, cc: ['orders@mphunited.com'], subject: `Order #${savedOrder.order_number}`, bodyHtml: '' })
      await attachFileToDraft(token, draft.id, `MPH PO ${savedOrder.order_number}.pdf`, base64)
      openDraft(draft.webLink)
      toast.success('Draft created with PDF attached — opening Outlook...')
    } catch (err) {
      toast.error(`Failed to create draft: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setEmailingPO(false) }
  }

  async function handleSubmit(data: OrderFormValues) {
    if (isManualMode) {
      const trimmed = manualPONumber.trim()
      if (!trimmed || /\s/.test(trimmed)) { setManualPOError('PO number cannot be empty or contain spaces'); return }
      const checkRes = await fetch(`/api/orders/check-po?number=${encodeURIComponent(trimmed)}`)
      const { exists } = await checkRes.json()
      if (exists) { toast.error('PO number already exists'); return }
      await onSubmit({ ...data, manual_order_number: trimmed })
    } else {
      await onSubmit(data)
    }
  }

  function handleNewOrder() {
    setSavedOrder(null); setOrderTypeManuallySet(false); form.reset()
    setLoads([emptyLoad()])
  }

  const savedOrderNumber = savedOrder?.order_number ?? ''

  if (savedOrder) {
    return (
      <div className="p-6 max-w-xl space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <p className="font-semibold text-green-800 dark:text-green-200">Order {savedOrder.order_number} saved successfully.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {contactEmails.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleEmailPO} disabled={emailingPO}>
                <Mail className="mr-2 h-4 w-4" />{emailingPO ? 'Creating draft…' : 'Email Contacts Via Outlook'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>View Orders</Button>
            <Button variant="outline" size="sm" onClick={handleNewOrder}>New Order</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex gap-6 p-6">
      <div className="flex-1 min-w-0 space-y-6">

        {/* Order Identity */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Order Identity</h2>
          {canUseManualPO && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                <Switch id="manual_po_toggle" checked={isManualMode} onCheckedChange={v => { setIsManualMode(v); if (!v) { setManualPONumber(''); setManualPOError(null); form.setValue('qb_invoice_number', '') } }} />
                <Label htmlFor="manual_po_toggle" className="cursor-pointer font-medium">Manual PO Number</Label>
                <span className="text-xs text-muted-foreground">For importing historical orders</span>
              </div>
              {isManualMode && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="manual_po_number">MPH PO Number *</Label>
                    <Input id="manual_po_number" placeholder="e.g. 12345 or PM-MPH12345" value={manualPONumber} onChange={e => { setManualPONumber(e.target.value); setManualPOError(null) }} />
                    {manualPOError && <p className="text-xs text-destructive">{manualPOError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qb_invoice_number">Invoice Number</Label>
                    <Input id="qb_invoice_number" placeholder="QB invoice #" {...form.register('qb_invoice_number')} />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="order_date">Order Date *</Label>
              <Input id="order_date" type="date" {...form.register('order_date')} />
              {form.formState.errors.order_date && <p className="text-xs text-destructive">{form.formState.errors.order_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select defaultValue="Pending" onValueChange={v => { if (v !== null) form.setValue('status', v) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Salesperson *</Label>
              <OrderCombobox options={salespersonOptions} value={watchedValues.salesperson_id ?? ''} onChange={v => form.setValue('salesperson_id', v, { shouldValidate: true })} placeholder="Choose salesperson" />
              {form.formState.errors.salesperson_id && <p className="text-xs text-destructive">{form.formState.errors.salesperson_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CSR *</Label>
              <OrderCombobox options={csrOptions} value={watchedValues.csr_id ?? ''} onChange={v => form.setValue('csr_id', v, { shouldValidate: true })} placeholder="Choose CSR" />
              {form.formState.errors.csr_id && <p className="text-xs text-destructive">{form.formState.errors.csr_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>CSR 2 (optional)</Label>
              <Select value={watchedValues.csr2_id ?? 'none'} onValueChange={v => form.setValue('csr2_id', v === 'none' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None">{watchedValues.csr2_id && watchedValues.csr2_id !== 'none' ? (csrOptions.find(u => u.id === watchedValues.csr2_id)?.name ?? watchedValues.csr2_id) : 'None'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {csrOptions.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        {/* Customer & Vendor */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer & Vendor</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <OrderCombobox options={customers} value={watchedValues.customer_id ?? ''} onChange={v => form.setValue('customer_id', v, { shouldValidate: true })} placeholder="Choose customer" />
              {form.formState.errors.customer_id && <p className="text-xs text-destructive">{form.formState.errors.customer_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <OrderCombobox options={vendors} value={watchedValues.vendor_id ?? ''} onChange={v => form.setValue('vendor_id', v)} placeholder="Choose vendor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_po">Customer PO *</Label>
              <Input id="customer_po" placeholder="PO number" {...form.register('customer_po')} />
              {form.formState.errors.customer_po && <p className="text-xs text-destructive">{form.formState.errors.customer_po.message}</p>}
            </div>
            {vendors.find(v => v.id === watchedValues.vendor_id)?.name === 'MPH United / Alliance Container -- Hillsboro, TX' && (
              <div className="space-y-1.5">
                <Label htmlFor="sales_order_number">Sales Order #</Label>
                <Input id="sales_order_number" placeholder="Sales order number" {...form.register('sales_order_number')} />
              </div>
            )}
            <div className="col-span-2 flex items-center gap-2">
              <Switch id="is_blind_shipment" checked={watchedValues.is_blind_shipment ?? false} onCheckedChange={v => form.setValue('is_blind_shipment', v)} />
              <Label htmlFor="is_blind_shipment" className="cursor-pointer">Blind Shipment</Label>
            </div>
          </div>
        </section>

        <Separator />

        {/* Line Items */}
        <section>
          <OrderSplitLoadsEditor
            loads={loads}
            orderPo={savedOrderNumber}
            orderCustomerPo={form.watch('customer_po') ?? ''}
            orderShipDate={form.watch('ship_date') ?? ''}
            orderWantedDate={form.watch('wanted_date') ?? ''}
            terms={form.watch('terms') ?? ''}
            csrInitials={csrInitials}
            onTermsChange={v => form.setValue('terms', v)}
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
              <Select value={form.watch('freight_carrier') ?? ''} onValueChange={v => form.setValue('freight_carrier', v || undefined, { shouldValidate: true })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select carrier" /></SelectTrigger>
                <SelectContent>{carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>MPH Freight Cost</Label><Input type="number" min="0" step="0.01" placeholder="0.00" {...form.register('freight_cost', { valueAsNumber: true })} /></div>
            <div className="space-y-1.5"><Label>Customer Freight Cost</Label><Input type="number" min="0" step="0.01" placeholder="0.00" {...form.register('freight_to_customer', { valueAsNumber: true })} /></div>
            <div className="space-y-1.5"><Label>Additional Costs</Label><Input type="number" min="0" step="0.01" placeholder="0.00" {...form.register('additional_costs', { valueAsNumber: true })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Appointment Time</Label><Input placeholder="e.g. 9:00 AM — 10:00 AM" {...form.register('appointment_time')} /></div>
            <div className="space-y-1.5"><Label>Appointment Notes</Label><Input placeholder="Optional" {...form.register('appointment_notes')} /></div>
          </div>
        </section>

        <Separator />

        {/* Addresses & Contacts */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Addresses & Contacts</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3"><p className="text-sm font-medium">Ship To</p><OrderAddressFields prefix="ship_to" register={form.register} notesLabel="Ship To Notes" /></div>
            <div className="space-y-3"><p className="text-sm font-medium">Bill To</p><OrderAddressFields prefix="bill_to" register={form.register} notesLabel="Bill To Notes" /></div>
            <OrderContactFields control={form.control} register={form.register} />
          </div>
        </section>

        <Separator />

        {/* Notes */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between py-1 transition-opacity hover:opacity-70">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notes</span>
            {notesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label htmlFor="po_notes">PO Notes</Label><Textarea id="po_notes" placeholder="Appears on the purchase order" rows={3} {...form.register('po_notes')} /></div>
              <div className="space-y-1.5"><Label htmlFor="freight_invoice_notes">Freight/Invoice Notes</Label><Textarea id="freight_invoice_notes" placeholder="Delivery, invoicing, or carrier instructions" rows={3} {...form.register('freight_invoice_notes')} /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="misc_notes">Misc Notes</Label><Textarea id="misc_notes" placeholder="Internal notes" rows={3} {...form.register('misc_notes')} /></div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Save button */}
        <div className="space-y-2 pt-2">
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Order'}</Button>
        </div>

      </div>

      <aside className="w-64 shrink-0 space-y-4">
        <OrderMarginCard control={form.control} loads={loads} />
      </aside>
    </form>
  )
}
