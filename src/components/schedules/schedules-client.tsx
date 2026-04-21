"use client";

// src/components/schedules/schedules-client.tsx
// Main UI for /schedules. Handles date range, vendor selection, PDF generation,
// and Outlook Web email deeplinks for all three schedule types.

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, FileText, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMonFri } from "@/lib/schedules/date-utils";
import { buildScheduleEmailUrl } from "@/lib/schedules/email-utils";

interface VendorOption {
  id: string;
  name: string;
}

type ScheduleType = "admin" | "vendor" | "frontline";

export function SchedulesClient() {
  const { monday, friday } = getMonFri();

  const [startDate, setStartDate] = useState(monday);
  const [endDate, setEndDate] = useState(friday);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Loading states per schedule type
  const [generating, setGenerating] = useState<ScheduleType | null>(null);

  // Shipment counts returned after generation (for display)
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [vendorCount, setVendorCount] = useState<number | null>(null);
  const [frontlineCount, setFrontlineCount] = useState<number | null>(null);

  // Email deeplink URLs built after PDF generation
  const [adminEmailUrl, setAdminEmailUrl] = useState<string | null>(null);
  const [vendorEmailUrl, setVendorEmailUrl] = useState<string | null>(null);
  const [frontlineEmailUrl, setFrontlineEmailUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vendors?active=true")
      .then((r) => r.json())
      .then((data: VendorOption[]) => {
        setVendors(data);
        if (data.length > 0) setSelectedVendorId(data[0].id);
      })
      .catch(() => toast.error("Failed to load vendors"))
      .finally(() => setLoadingVendors(false));
  }, []);

  const handleGenerateAdmin = useCallback(async () => {
    setGenerating("admin");
    setAdminCount(null);
    setAdminEmailUrl(null);
    try {
      const res = await fetch("/api/schedules/admin-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (!res.ok) throw new Error(await res.text());

      const count = parseInt(res.headers.get("x-shipment-count") ?? "0", 10);
      const emailUrl = res.headers.get("x-email-url") ?? null;
      setAdminCount(count);
      setAdminEmailUrl(emailUrl);

      // Trigger PDF download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MPH-Admin-Schedule-${startDate}-to-${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Admin schedule generated — ${count} shipment${count !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to generate admin schedule");
    } finally {
      setGenerating(null);
    }
  }, [startDate, endDate]);

  const handleGenerateVendor = useCallback(async () => {
    if (!selectedVendorId) {
      toast.error("Select a vendor first");
      return;
    }
    setGenerating("vendor");
    setVendorCount(null);
    setVendorEmailUrl(null);
    try {
      const res = await fetch("/api/schedules/vendor-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, vendorId: selectedVendorId }),
      });
      if (!res.ok) throw new Error(await res.text());

      const count = parseInt(res.headers.get("x-shipment-count") ?? "0", 10);
      const emailUrl = res.headers.get("x-email-url") ?? null;
      setVendorCount(count);
      setVendorEmailUrl(emailUrl);

      const vendorName = vendors.find((v) => v.id === selectedVendorId)?.name ?? "Vendor";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MPH-${vendorName}-Schedule-${startDate}-to-${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${vendorName} schedule generated — ${count} shipment${count !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to generate vendor schedule");
    } finally {
      setGenerating(null);
    }
  }, [startDate, endDate, selectedVendorId, vendors]);

  const handleGenerateFrontline = useCallback(async () => {
    setGenerating("frontline");
    setFrontlineCount(null);
    setFrontlineEmailUrl(null);
    try {
      const res = await fetch("/api/schedules/vendor-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, frontline: true }),
      });
      if (!res.ok) throw new Error(await res.text());

      const count = parseInt(res.headers.get("x-shipment-count") ?? "0", 10);
      const emailUrl = res.headers.get("x-email-url") ?? null;
      setFrontlineCount(count);
      setFrontlineEmailUrl(emailUrl);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MPH-Frontline-Schedule-${startDate}-to-${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Frontline schedule generated — ${count} shipment${count !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to generate Frontline schedule");
    } finally {
      setGenerating(null);
    }
  }, [startDate, endDate]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Weekly Schedules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and email shipping schedules for owners, vendors, and Frontline.
        </p>
      </div>

      {/* Date Range */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-[#B88A44]" />
          Date Range
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="start-date" className="text-xs text-muted-foreground">
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              className="h-8 w-40 text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end-date" className="text-xs text-muted-foreground">
              End Date
            </Label>
            <Input
              id="end-date"
              type="date"
              className="h-8 w-40 text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Admin Schedule */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Admin / Owner Schedule</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            All active orders grouped by vendor. Includes pricing. Sent to internal team.
          </p>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleGenerateAdmin}
            disabled={generating !== null}
            className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90"
          >
            {generating === "admin" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate PDF
          </Button>
          {adminCount !== null && (
            <span className="text-sm text-muted-foreground">
              {adminCount} shipment{adminCount !== 1 ? "s" : ""}
            </span>
          )}
          {adminEmailUrl && (
            <a href={adminEmailUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-8 text-sm">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Open in Outlook
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Vendor Schedule */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Vendor Schedule</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Orders for a single vendor. No pricing. Sent to vendor schedule contacts.
          </p>
        </div>
        <Separator />
        <div className="space-y-1.5">
          <Label htmlFor="vendor-select" className="text-xs text-muted-foreground">
            Select Vendor
          </Label>
          {loadingVendors ? (
            <div className="text-sm text-muted-foreground">Loading vendors…</div>
          ) : (
            <Select value={selectedVendorId} onValueChange={(v) => setSelectedVendorId(v ?? '')}>
              <SelectTrigger id="vendor-select" className="h-8 w-64 text-sm">
                <SelectValue placeholder="Choose a vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-sm">
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleGenerateVendor}
            disabled={generating !== null || !selectedVendorId}
            className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90"
          >
            {generating === "vendor" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate PDF
          </Button>
          {vendorCount !== null && (
            <span className="text-sm text-muted-foreground">
              {vendorCount} shipment{vendorCount !== 1 ? "s" : ""}
            </span>
          )}
          {vendorEmailUrl && (
            <a href={vendorEmailUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-8 text-sm">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Open in Outlook
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Frontline Schedule */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Frontline Schedule</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            All orders across all vendors where freight carrier is Frontline. No pricing.
          </p>
        </div>
        <Separator />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleGenerateFrontline}
            disabled={generating !== null}
            className="h-8 text-sm bg-[#00205B] hover:bg-[#00205B]/90"
          >
            {generating === "frontline" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate PDF
          </Button>
          {frontlineCount !== null && (
            <span className="text-sm text-muted-foreground">
              {frontlineCount} shipment{frontlineCount !== 1 ? "s" : ""}
            </span>
          )}
          {frontlineEmailUrl && (
            <a href={frontlineEmailUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-8 text-sm">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Open in Outlook
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
