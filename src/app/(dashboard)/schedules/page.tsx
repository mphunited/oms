// src/app/(dashboard)/schedules/page.tsx
// Weekly schedule generation page.
// Admin PDF: all active orders grouped by vendor, includes pricing.
// Vendor PDF: per-vendor orders only, no pricing.
// Frontline PDF: all orders where freight_carrier = "Frontline", no pricing.
// Both types have date range selector, shipment count, and Outlook Web email button.

import { SchedulesClient } from "@/components/schedules/schedules-client";

export const metadata = { title: "Weekly Schedules — MPH United" };

export default function SchedulesPage() {
  return <SchedulesClient />;
}
