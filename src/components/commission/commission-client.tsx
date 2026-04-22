"use client";

// src/components/commission/commission-client.tsx
// Commission report UI.
// Columns: Vendor, Customer, Sales/CSR, MPH PO, Customer PO, Description,
//          Ship Date, Qty, MPH Invoice, Commission Status, Invoice Status
// Filters: salesperson, commission status, invoice status, date range
// ADMIN/ACCOUNTING can mark selected orders as Commission Paid with a payroll date.

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, DollarSign } from "lucide-react";
import { COMMISSION_STATUSES, INVOICE_PAYMENT_STATUSES } from "@/lib/db/schema";
import { CommissionBadge } from "@/components/commission/commission-badge";

export interface CommissionRow {
  id: string;
  order_number: string;
  customer_po: string | null;
  ship_date: string | null;
  order_type: string | null;
  commission_status: string;
  invoice_payment_status: string;
  qb_invoice_number: string | null;
  invoice_paid_date: string | null;
  commission_paid_date: string | null;
  vendorName: string;
  customerName: string;
  salespersonName: string | null;
  csrName: string | null;
  description: string | null;
  qty: string | null;
}

interface UserOption {
  id: string;
  name: string | null;
  role: string;
}

export function CommissionClient() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Filters
  const [salespersonId, setSalespersonId] = useState<string>("all");
  const [commissionStatus, setCommissionStatus] = useState<string>("all");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selection for bulk mark-paid
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payrollDate, setPayrollDate] = useState("");
  const [marking, setMarking] = useState(false);

  // Current user role (from session)
  const [myRole, setMyRole] = useState<string | null>(null);

  useEffect(() => {
    // Load current user role + salesperson list
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: UserOption[]) => {
        setUsers(data.filter((u) => u.role === "SALES" || u.role === "ADMIN"));
      })
      .catch(() => toast.error("Failed to load users"));

    fetch("/api/me")
      .then((r) => r.json())
      .then((me: { role: string }) => setMyRole(me.role))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams();
      if (salespersonId !== "all") params.set("salespersonId", salespersonId);
      if (commissionStatus !== "all") params.set("commissionStatus", commissionStatus);
      if (invoiceStatus !== "all") params.set("invoiceStatus", invoiceStatus);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/commission?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data: CommissionRow[] = await res.json();
      setRows(data);
    } catch {
      toast.error("Failed to load commission data");
    } finally {
      setLoading(false);
    }
  }, [salespersonId, commissionStatus, invoiceStatus, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, []); // Initial load — user clicks "Search" for filtered runs

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const eligible = rows.filter((r) => r.commission_status === "Eligible").map((r) => r.id);
    if (selected.size === eligible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible));
    }
  };

  const handleMarkPaid = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one order");
      return;
    }
    if (!payrollDate) {
      toast.error("Enter the payroll Friday date");
      return;
    }
    setMarking(true);
    try {
      const res = await fetch("/api/commission/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: Array.from(selected),
          commissionPaidDate: payrollDate,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`${selected.size} order${selected.size !== 1 ? "s" : ""} marked Commission Paid`);
      setSelected(new Set());
      setPayrollDate("");
      fetchData();
    } catch {
      toast.error("Failed to mark orders as paid");
    } finally {
      setMarking(false);
    }
  };

  const eligibleSelected = rows.filter(
    (r) => selected.has(r.id) && r.commission_status === "Eligible"
  ).length;

  const canMarkPaid = myRole === "ADMIN" || myRole === "ACCOUNTING";

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Commission Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track commission eligibility and payroll by order.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Salesperson filter — ADMIN/ACCOUNTING only */}
          {canMarkPaid && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Salesperson</Label>
              <Select value={salespersonId} onValueChange={(v) => setSalespersonId(v ?? '')}>
                <SelectTrigger className="h-8 w-44 text-sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-sm">All</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-sm">
                      {u.name ?? u.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Commission Status */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Commission Status</Label>
            <Select value={commissionStatus} onValueChange={(v) => setCommissionStatus(v ?? '')}>
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All</SelectItem>
                {COMMISSION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Status */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Invoice Status</Label>
            <Select value={invoiceStatus} onValueChange={(v) => setInvoiceStatus(v ?? '')}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All</SelectItem>
                {INVOICE_PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ship Date Range */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ship Date From</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ship Date To</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <Button
            onClick={fetchData}
            disabled={loading}
            className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90 self-end"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
          </Button>
        </div>
      </div>

      {/* Mark Paid bar — ADMIN/ACCOUNTING only */}
      {canMarkPaid && (
        <div className="rounded-lg border border-[#B88A44]/40 bg-[#B88A44]/5 p-4 flex flex-wrap items-center gap-4">
          <DollarSign className="h-4 w-4 text-[#B88A44]" />
          <span className="text-sm font-medium text-foreground">
            Mark Commission Paid
          </span>
          <span className="text-sm text-muted-foreground">
            {eligibleSelected} eligible order{eligibleSelected !== 1 ? "s" : ""} selected
          </span>
          <div className="space-y-0.5">
            <Label className="text-xs text-muted-foreground">Payroll Date (Friday)</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={payrollDate}
              onChange={(e) => setPayrollDate(e.target.value)}
            />
          </div>
          <Button
            onClick={handleMarkPaid}
            disabled={marking || eligibleSelected === 0 || !payrollDate}
            className="h-8 text-sm bg-[#B88A44] hover:bg-[#B88A44]/90 text-white"
          >
            {marking ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            Mark {eligibleSelected} Paid
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#00205B] text-white text-xs">
              {canMarkPaid && (
                <th className="px-3 py-2 text-left w-8">
                  <Checkbox
                    checked={
                      selected.size > 0 &&
                      selected.size ===
                        rows.filter((r) => r.commission_status === "Eligible").length
                    }
                    onCheckedChange={toggleSelectAll}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#00205B]"
                  />
                </th>
              )}
              <th className="px-3 py-2 text-left">Vendor</th>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Sales/CSR</th>
              <th className="px-3 py-2 text-left">MPH PO</th>
              <th className="px-3 py-2 text-left">Cust PO</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Ship Date</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-left">MPH Invoice</th>
              <th className="px-3 py-2 text-left">Commission</th>
              <th className="px-3 py-2 text-left">Invoice Status</th>
              <th className="px-3 py-2 text-left">Inv Paid Date</th>
              <th className="px-3 py-2 text-left">Comm Paid Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={canMarkPaid ? 14 : 13}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={canMarkPaid ? 14 : 13}
                  className="px-3 py-8 text-center text-muted-foreground text-sm"
                >
                  No orders match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-t border-border ${i % 2 === 1 ? "bg-muted/30" : ""} hover:bg-muted/50`}
                >
                  {canMarkPaid && (
                    <td className="px-3 py-2">
                      {row.commission_status === "Eligible" && (
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs">{row.vendorName}</td>
                  <td className="px-3 py-2 text-xs">{row.customerName}</td>
                  <td className="px-3 py-2 text-xs">
                    {[row.salespersonName, row.csrName].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">{row.order_number}</td>
                  <td className="px-3 py-2 text-xs">{row.customer_po ?? "—"}</td>
                  <td className="px-3 py-2 text-xs max-w-[160px] truncate" title={row.description ?? ""}>
                    {row.description ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{formatDate(row.ship_date)}</td>
                  <td className="px-3 py-2 text-xs text-right">{row.qty ?? "—"}</td>
                  <td className="px-3 py-2 text-xs font-mono">{row.qb_invoice_number ?? "—"}</td>
                  <td className="px-3 py-2">
                    <CommissionBadge status={row.commission_status} />
                  </td>
                  <td className="px-3 py-2">
                    <InvoiceStatusBadge status={row.invoice_payment_status} />
                  </td>
                  <td className="px-3 py-2 text-xs">{formatDate(row.invoice_paid_date)}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(row.commission_paid_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {rows.length} order{rows.length !== 1 ? "s" : ""} shown
        </p>
      )}
    </div>
  );
}

// Inline badge for invoice status — small enough to keep in this file
function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Not Invoiced": "bg-gray-100 text-gray-600",
    "Invoiced":     "bg-blue-100 text-blue-700",
    "Paid":         "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
