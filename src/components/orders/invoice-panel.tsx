"use client";

// src/components/orders/invoice-panel.tsx
// Invoice & QB fields panel — placed in right column below Live Margin on order edit page.
// Fields: invoice_payment_status, qb_invoice_number, invoice_paid_date
// Intended for Accounting role but visible to all (editing gated by role in parent if needed).

import { Control, Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVOICE_PAYMENT_STATUSES } from "@/lib/db/schema";

// Accept the parent form's Control — avoids prop-drilling the full form object.
// The parent form must include invoice_payment_status, qb_invoice_number, invoice_paid_date.
interface InvoicePanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

export function InvoicePanel({ control }: InvoicePanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Invoice & Payment</h3>

      {/* Invoice Payment Status */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_payment_status" className="text-xs text-muted-foreground">
          Invoice Status
        </Label>
        <Controller
          control={control}
          name="invoice_payment_status"
          render={({ field }) => (
            <Select value={field.value ?? "Not Invoiced"} onValueChange={field.onChange}>
              <SelectTrigger id="invoice_payment_status" className="h-8 text-sm">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* QB Invoice Number */}
      <div className="space-y-1.5">
        <Label htmlFor="qb_invoice_number" className="text-xs text-muted-foreground">
          MPH Invoice # (QB)
        </Label>
        <Controller
          control={control}
          name="qb_invoice_number"
          render={({ field }) => (
            <Input
              id="qb_invoice_number"
              className="h-8 text-sm"
              placeholder="e.g. 1042"
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Invoice Paid Date */}
      <div className="space-y-1.5">
        <Label htmlFor="invoice_paid_date" className="text-xs text-muted-foreground">
          Invoice Paid Date
        </Label>
        <Controller
          control={control}
          name="invoice_paid_date"
          render={({ field }) => (
            <Input
              id="invoice_paid_date"
              type="date"
              className="h-8 text-sm"
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />
        <p className="text-[11px] text-muted-foreground leading-tight">
          Date customer paid — triggers commission eligibility
        </p>
      </div>
    </div>
  );
}
