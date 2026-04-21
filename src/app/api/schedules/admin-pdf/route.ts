// src/app/api/schedules/admin-pdf/route.ts
// POST /api/schedules/admin-pdf
// Generates admin schedule PDF. Returns PDF blob + shipment count + email URL headers.
// Requires nodejs runtime for @react-pdf/renderer.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { company_settings } from "@/lib/db/schema";
import { fetchScheduleOrders } from "@/lib/schedules/fetch-schedule-data";
import { AdminSchedulePdf } from "@/lib/schedules/build-admin-schedule-pdf";
import { buildScheduleEmailUrl } from "@/lib/schedules/email-utils";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { startDate, endDate } = body as { startDate: string; endDate: string };

  if (!startDate || !endDate) {
    return new NextResponse("startDate and endDate are required", { status: 400 });
  }

  // Fetch orders
  const orders = await fetchScheduleOrders(startDate, endDate);

  // Fetch admin schedule recipients from company_settings
  const [settings] = await db.select({
    admin_schedule_recipients: company_settings.admin_schedule_recipients,
  }).from(company_settings).limit(1);

  const recipients = (settings?.admin_schedule_recipients ?? []) as Array<{ name: string; email: string }>;

  // Build plain-text schedule body for email
  const scheduleBodyLines: string[] = [];
  const grouped = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!grouped.has(o.vendorName)) grouped.set(o.vendorName, []);
    grouped.get(o.vendorName)!.push(o);
  }
  for (const [vendor, vendorOrders] of grouped) {
    scheduleBodyLines.push(`\n${vendor} (${vendorOrders.length})`);
    for (const o of vendorOrders) {
      const shipDate = o.ship_date ?? "—";
      scheduleBodyLines.push(
        `  ${o.order_number} | ${o.customerName} | ${o.description ?? "—"} | Qty: ${o.qty ?? "—"} | Ship: ${shipDate}`
      );
    }
  }

  const emailUrl = buildScheduleEmailUrl({
    type: "admin",
    startDate,
    endDate,
    toContacts: recipients,
    shipmentCount: orders.length,
    scheduleBodyText: scheduleBodyLines.join("\n"),
  });

  // Render PDF
  const generatedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "short",
    timeStyle: "short",
  });

  const pdfBuffer = await renderToBuffer(
    React.createElement(AdminSchedulePdf, {
      startDate,
      endDate,
      orders,
      generatedAt,
    })
  );

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MPH-Admin-Schedule-${startDate}-${endDate}.pdf"`,
      "x-shipment-count": String(orders.length),
      "x-email-url": emailUrl,
    },
  });
}
