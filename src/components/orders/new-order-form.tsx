'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronUp, Mail, Plus, Trash2 } from 'lucide-react'
import type { Resolver, SubmitHandler } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addressSchema = z.object({
  name:           z.string().optional(),
  street:         z.string().optional(),
  city:           z.string().optional(),
  state:          z.string().optional(),
  zip:            z.string().optional(),
  phone:          z.string().optional(),
  shipping_notes: z.string().optional(),
})

// NaN (from empty <input type="number" valueAsNumber>) → undefined, valid number → number
const numericField = z
  .union([z.nan().transform(() => undefined), z.number().min(0)])
  .optional()

const splitLoadSchema = z.object({
  description:           z.string().optional(),
  part_number:           z.string().optional(),
  qty:                   numericField,
  buy:                   numericField,
  sell:                  numericField,
  bottle_cost:           numericField,
  bottle_qty:            numericField,
  mph_freight_bottles:   numericField,
  order_number_override: z.string().optional(),
})

const orderFormSchema = z.object({
  order_date:     z.string().min(1, 'Required'),
  salesperson_id: z.string().min(1, 'Required'),
  csr_id:         z.string().min(1, 'Required'),
  status:         z.string().min(1, 'Required'),
  order_type:     z.string().min(1, 'Required'),

  customer_id:     z.string().min(1, 'Required'),
  vendor_id:       z.string().optional(),
  customer_po:     z.string().min(1, 'Required'),
  freight_carrier: z.string().optional(),

  ship_date:   z.string().optional(),
  wanted_date: z.string().optional(),

  freight_cost:        numericField,
  freight_to_customer: numericField,
  terms:               z.string().optional(),
  additional_costs:    z
    .union([z.nan().transform(() => 0), z.number().min(0)])
    .default(0),

  appointment_time:  z.string().optional(),
  appointment_notes: z.string().optional(),

  ship_to: addressSchema.optional(),
  bill_to: addressSchema.optional(),

  customer_contacts: z.string().optional(),

  po_notes:              z.string().optional(),
  freight_invoice_notes: z.string().optional(),
  shipper_notes:         z.string().optional(),
  misc_notes:            z.string().optional(),

  flag: z.boolean().default(false),

  split_loads: z.array(splitLoadSchema).min(1),
})

type OrderFormValues = z.infer<typeof orderFormSchema>

const EMPTY_LOAD: z.infer<typeof splitLoadSchema> = {
  qty:                 undefined,
  buy:                 undefined,
  sell:                undefined,
  bottle_cost:         undefined,
  bottle_qty:          undefined,
  mph_freight_bottles: undefined,
}

// ─── Margin calculation ───────────────────────────────────────────────────────

const COMMISSION_TYPES = new Set(['Bottle', 'Rebottle IBC', 'Washout IBC'])

function computeMargin(values: Partial<OrderFormValues>) {
  const loads     = values.split_loads ?? []
  const orderType = values.order_type  ?? ''

  const totalRevenue = loads.reduce((sum, load) => {
    return sum + (Number(load.sell) || 0) * (Number(load.qty) || 0)
  }, 0)

  const totalCOGS = loads.reduce((sum, load) => {
    return sum + (Number(load.buy) || 0) * (Number(load.qty) || 0)
  }, 0)

  const totalBottleCost = loads.reduce((sum, load) => {
    const bottleCost     = (Number(load.bottle_cost)          || 0) * (Number(load.bottle_qty) || 0)
    const mphFreightCost = ((Number(load.mph_freight_bottles) || 0) / 90) * (Number(load.bottle_qty) || 0)
    return sum + bottleCost + mphFreightCost
  }, 0)

  const totalQty = loads.reduce((sum, load) => sum + (Number(load.qty) || 0), 0)

  const freightToCustomer   = Number(values.freight_to_customer) || 0
  const freightCost         = Number(values.freight_cost)        || 0
  const additionalCosts     = Number(values.additional_costs)    || 0
  const commissionDeduction = COMMISSION_TYPES.has(orderType) ? 3 * totalQty : 0

  const totalTopLine = totalRevenue + freightToCustomer
  const grossMargin  = totalTopLine - totalCOGS - totalBottleCost
  const netMargin    = grossMargin - freightCost - additionalCosts - commissionDeduction
  const marginPct    = totalTopLine > 0 ? (netMargin / totalTopLine) * 100 : null

  return {
    totalRevenue,
    freightToCustomer,
    totalTopLine,
    totalCOGS,
    totalBottleCost,
    grossMargin,
    freightCost,
    additionalCosts,
    commissionDeduction,
    totalQty,
    netMargin,
    marginPct,
  }
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

type Option = { id: string; name: string }

function Combobox({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-9 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        disabled={disabled}
      >
        {selected
          ? selected.name
          : <span className="text-muted-foreground">{placeholder}</span>}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        className="min-w-[var(--anchor-width)] p-0"
        side="bottom"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map(opt => (
                <CommandItem
                  key={opt.id}
                  value={opt.name}
                  onSelect={() => { onChange(opt.id); setOpen(false) }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt.id ? 'opacity-100' : 'opacity-0')} />
                  {opt.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Address fields ───────────────────────────────────────────────────────────

function AddressFields({
  prefix,
  register,
}: {
  prefix: 'ship_to' | 'bill_to'
  register: ReturnType<typeof useForm<OrderFormValues>>['register']
}) {
  return (
    <div className="grid grid-cols-6 gap-3">
      <div className="col-span-6 space-y-1.5">
        <Label>Name / company</Label>
        <Input placeholder="Name or company" {...register(`${prefix}.name`)} />
      </div>
      <div className="col-span-6 space-y-1.5">
        <Label>Street</Label>
        <Input placeholder="Street address" {...register(`${prefix}.street`)} />
      </div>
      <div className="col-span-3 space-y-1.5">
        <Label>City</Label>
        <Input placeholder="City" {...register(`${prefix}.city`)} />
      </div>
      <div className="col-span-1 space-y-1.5">
        <Label>State</Label>
        <Input placeholder="ST" {...register(`${prefix}.state`)} />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label>ZIP</Label>
        <Input placeholder="00000" {...register(`${prefix}.zip`)} />
      </div>
      <div className="col-span-3 space-y-1.5">
        <Label>Phone</Label>
        <Input placeholder="Phone" {...register(`${prefix}.phone`)} />
      </div>
      <div className="col-span-6 space-y-1.5">
        <Label>Shipping notes</Label>
        <Input placeholder="Optional" {...register(`${prefix}.shipping_notes`)} />
      </div>
    </div>
  )
}

// ─── Margin card ──────────────────────────────────────────────────────────────

function MarginCard({ values }: { values: Partial<OrderFormValues> }) {
  const m     = computeMargin(values)
  const isLow = m.marginPct !== null && m.marginPct < 8

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Live Margin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Revenue</span>
          <span>${m.totalRevenue.toFixed(2)}</span>
        </div>
        {m.freightToCustomer > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>+ Freight to customer</span>
            <span>${m.freightToCustomer.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>− COGS</span>
          <span>${m.totalCOGS.toFixed(2)}</span>
        </div>
        {m.totalBottleCost > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>− Bottle costs</span>
            <span>${m.totalBottleCost.toFixed(2)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gross margin</span>
          <span>${m.grossMargin.toFixed(2)}</span>
        </div>
        {m.freightCost > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>− Freight cost</span>
            <span>${m.freightCost.toFixed(2)}</span>
          </div>
        )}
        {m.additionalCosts > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>− Additional costs</span>
            <span>${m.additionalCosts.toFixed(2)}</span>
          </div>
        )}
        {m.commissionDeduction > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>− Commission ($3 × {m.totalQty})</span>
            <span>${m.commissionDeduction.toFixed(2)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>Net margin</span>
          <span className={isLow ? 'text-destructive' : ''}>${m.netMargin.toFixed(2)}</span>
        </div>
        {m.marginPct !== null && (
          <div className={cn(
            'text-center text-2xl font-bold pt-1',
            isLow ? 'text-destructive' : 'text-green-600 dark:text-green-400',
          )}>
            {m.marginPct.toFixed(1)}%
            {isLow && (
              <p className="text-xs font-normal text-destructive mt-0.5">⚠ below 8% threshold</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  'Pending',
  'Waiting On Vendor To Confirm',
  'Waiting To Confirm To Customer',
  'Confirmed To Customer',
  'Rinse And Return Stage',
  'Sent Order To Carrier',
  'Ready To Ship',
  'Ready To Invoice',
  'Complete',
  'Cancelled',
]

const ORDER_TYPES = ['Bottle', 'Rebottle IBC', 'Washout IBC', 'Drums', 'Parts']
const TERMS       = ['PPD', 'PPA', 'FOB']

// ─── Main form ────────────────────────────────────────────────────────────────

type UserOption = { id: string; name: string | null; role: string }

export function NewOrderForm() {
  const router = useRouter()

  const [customers,    setCustomers]    = useState<Option[]>([])
  const [vendors,      setVendors]      = useState<Option[]>([])
  const [users,        setUsers]        = useState<UserOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedOrder,   setSavedOrder]   = useState<{ id: string; order_number: string } | null>(null)
  const [notesOpen,    setNotesOpen]    = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([c, v, u]) => {
      setCustomers(c)
      setVendors(v)
      setUsers(u)
    })
  }, [])

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      order_date:       new Date().toISOString().slice(0, 10),
      status:           'Pending',
      flag:             false,
      additional_costs: 0,
      split_loads:      [EMPTY_LOAD],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name:    'split_loads',
  })

  const watchedValues    = form.watch()
  const orderType        = watchedValues.order_type ?? ''
  const showBottleFields = orderType === 'Bottle' || orderType === 'Rebottle IBC'

  const salespersonOptions: Option[] = users
    .filter(u => u.role === 'SALESPERSON' || u.role === 'ADMIN')
    .map(u => ({ id: u.id, name: u.name ?? u.id }))

  const csrOptions: Option[] = users
    .filter(u => u.role === 'CSR' || u.role === 'ADMIN')
    .map(u => ({ id: u.id, name: u.name ?? u.id }))

  const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      const order = await res.json() as { id: string; order_number: string }
      setSavedOrder(order)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }


  const contactsText  = watchedValues.customer_contacts ?? ''
  const emailMatches  = contactsText.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []
  const orderSubject  = savedOrder ? `Order #${savedOrder.order_number}` : ''
  const outlookHref   = emailMatches.length > 0 && savedOrder
    ? `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(emailMatches.join(';'))}&subject=${encodeURIComponent(orderSubject)}`
    : null

  // ── Post-save banner ──────────────────────────────────────────────────────
  if (savedOrder) {
    return (
      <div className="p-6 max-w-xl space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <p className="font-semibold text-green-800 dark:text-green-200">
            Order {savedOrder.order_number} saved successfully.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {outlookHref && (
              <a href={outlookHref} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <Mail className="mr-2 h-4 w-4" />
                  Email contacts via Outlook
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>
              View orders
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setSavedOrder(null); form.reset() }}>
              New order
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-6 p-6">

      {/* ── Main column ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Section 1 — Order Identity */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Order Identity
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="order_date">Order date *</Label>
              <Input id="order_date" type="date" {...form.register('order_date')} />
              {form.formState.errors.order_date && (
                <p className="text-xs text-destructive">{form.formState.errors.order_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select defaultValue="Pending" onValueChange={v => form.setValue('status', v as string)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Salesperson *</Label>
              <Combobox
                options={salespersonOptions}
                value={watchedValues.salesperson_id ?? ''}
                onChange={v => form.setValue('salesperson_id', v, { shouldValidate: true })}
                placeholder="Choose salesperson"
              />
              {form.formState.errors.salesperson_id && (
                <p className="text-xs text-destructive">{form.formState.errors.salesperson_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>CSR *</Label>
              <Combobox
                options={csrOptions}
                value={watchedValues.csr_id ?? ''}
                onChange={v => form.setValue('csr_id', v, { shouldValidate: true })}
                placeholder="Choose CSR"
              />
              {form.formState.errors.csr_id && (
                <p className="text-xs text-destructive">{form.formState.errors.csr_id.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Order type *</Label>
              <Select onValueChange={v => form.setValue('order_type', v as string, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select order type" /></SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.order_type && (
                <p className="text-xs text-destructive">{form.formState.errors.order_type.message}</p>
              )}
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 2 — Customer & Vendor */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Customer & Vendor
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Combobox
                options={customers}
                value={watchedValues.customer_id ?? ''}
                onChange={v => form.setValue('customer_id', v, { shouldValidate: true })}
                placeholder="Choose customer"
              />
              {form.formState.errors.customer_id && (
                <p className="text-xs text-destructive">{form.formState.errors.customer_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Combobox
                options={vendors}
                value={watchedValues.vendor_id ?? ''}
                onChange={v => form.setValue('vendor_id', v)}
                placeholder="Choose vendor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_po">Customer PO *</Label>
              <Input id="customer_po" placeholder="PO number" {...form.register('customer_po')} />
              {form.formState.errors.customer_po && (
                <p className="text-xs text-destructive">{form.formState.errors.customer_po.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="freight_carrier">Freight carrier</Label>
              <Input id="freight_carrier" placeholder="Carrier name" {...form.register('freight_carrier')} />
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 3 — Line Items */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Line Items
            </h2>
            {fields.length < 4 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_LOAD)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add split load
              </Button>
            )}
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {index === 0 ? 'Load 1 (Primary)' : `Load ${index + 1}`}
                </span>
                {index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-4 space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    placeholder="Product description"
                    {...form.register(`split_loads.${index}.description`)}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Part #</Label>
                  <Input
                    placeholder="Optional"
                    {...form.register(`split_loads.${index}.part_number`)}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...form.register(`split_loads.${index}.qty`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Buy</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register(`split_loads.${index}.buy`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Sell</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register(`split_loads.${index}.sell`, { valueAsNumber: true })}
                  />
                </div>
                <div className="col-span-6 space-y-1.5">
                  <Label>Order # override</Label>
                  <Input
                    placeholder="Optional"
                    {...form.register(`split_loads.${index}.order_number_override`)}
                  />
                </div>
              </div>

              {showBottleFields && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Bottle cost</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...form.register(`split_loads.${index}.bottle_cost`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Bottle qty</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      {...form.register(`split_loads.${index}.bottle_qty`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">MPH freight bottles</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      {...form.register(`split_loads.${index}.mph_freight_bottles`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <Separator />

        {/* Section 4 — Freight & Logistics */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Freight & Logistics
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="freight_cost">Freight cost</Label>
              <Input
                id="freight_cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('freight_cost', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="freight_to_customer">Freight to customer</Label>
              <Input
                id="freight_to_customer"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('freight_to_customer', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Terms</Label>
              <Select onValueChange={v => form.setValue('terms', v as string)}>
                <SelectTrigger><SelectValue placeholder="PPD / PPA / FOB" /></SelectTrigger>
                <SelectContent>
                  {TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="additional_costs">Additional costs</Label>
              <Input
                id="additional_costs"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...form.register('additional_costs', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ship_date">Ship date</Label>
              <Input id="ship_date" type="date" {...form.register('ship_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wanted_date">Wanted date</Label>
              <Input id="wanted_date" type="date" {...form.register('wanted_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appointment_time">Appointment time</Label>
              <Input
                id="appointment_time"
                placeholder="e.g. 9:00 AM – 10:00 AM"
                {...form.register('appointment_time')}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="appointment_notes">Appointment notes</Label>
              <Input
                id="appointment_notes"
                placeholder="Optional"
                {...form.register('appointment_notes')}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 5 — Addresses & Contacts */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Addresses & Contacts
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Ship to</p>
              <AddressFields prefix="ship_to" register={form.register} />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Bill to</p>
              <AddressFields prefix="bill_to" register={form.register} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="customer_contacts">Customer contacts</Label>
              <Textarea
                id="customer_contacts"
                placeholder="Names, phone numbers, and email addresses"
                rows={3}
                {...form.register('customer_contacts')}
              />
              <p className="text-xs text-muted-foreground">
                Include email addresses to generate an Outlook compose link after saving.
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 6 — Notes (collapsible) */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between py-1 transition-opacity hover:opacity-70">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Notes
            </span>
            {notesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="po_notes">PO notes</Label>
                <Textarea
                  id="po_notes"
                  placeholder="Appears on the purchase order"
                  rows={3}
                  {...form.register('po_notes')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="freight_invoice_notes">Freight / invoice notes</Label>
                <Textarea
                  id="freight_invoice_notes"
                  placeholder="Delivery, invoicing, or carrier instructions"
                  rows={3}
                  {...form.register('freight_invoice_notes')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shipper_notes">Shipper notes</Label>
                <Textarea
                  id="shipper_notes"
                  placeholder="Notes for the shipper or BOL"
                  rows={3}
                  {...form.register('shipper_notes')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="misc_notes">Misc notes</Label>
                <Textarea
                  id="misc_notes"
                  placeholder="Internal notes"
                  rows={3}
                  {...form.register('misc_notes')}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Flag & submit */}
        <div className="flex items-center justify-between pb-8">
          <div className="flex items-center gap-2">
            <Switch
              id="flag"
              checked={watchedValues.flag ?? false}
              onCheckedChange={v => form.setValue('flag', v)}
            />
            <Label htmlFor="flag" className="cursor-pointer">Flag this order</Label>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Order'}
          </Button>
        </div>
      </div>

      {/* ── Sticky sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0">
        <MarginCard values={watchedValues} />
      </aside>
    </form>
  )
}
