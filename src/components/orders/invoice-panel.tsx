'use client'

import type { UseFormRegister } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InvoicePanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>
}

export function InvoicePanel({ register }: InvoicePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1.5">
          <Label htmlFor="qb_invoice_number">QB Invoice #</Label>
          <Input
            id="qb_invoice_number"
            placeholder="QuickBooks invoice number"
            {...register('qb_invoice_number')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invoice_paid_date">Paid Date</Label>
          <Input
            id="invoice_paid_date"
            type="date"
            {...register('invoice_paid_date')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
