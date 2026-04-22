// src/app/api/schedules/vendor-pdf/route.ts
// POST /api/schedules/vendor-pdf
// Generates vendor or Frontline schedule PDF.
// Body: { startDate, endDate, vendorId? } for vendor schedule
//       { startDate, endDate, frontline: true } for Frontline schedule
// Returns PDF blob + shipment count + email URL headers.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { vendors, company_settings } from "@/lib/db/schema";
import { fetchScheduleOrders } from "@/lib/schedules/fetch-schedule-data";
import { VendorSchedulePdf } from "@/lib/schedules/build-vendor-schedule-pdf";
import { buildScheduleEmailUrl } from "@/lib/schedules/email-utils";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const {
    startDate,
    endDate,
    vendorId,
    frontline,
  } = body as {
    startDate: string;
    endDate: string;
    vendorId?: string;
    frontline?: boolean;
  };

  if (!startDate || !endDate) {
    return new NextResponse("startDate and endDate are required", { status: 400 });
  }
  if (!vendorId && !frontline) {
    return new NextResponse("vendorId or frontline:true is required", { status: 400 });
  }

  const isFrontline = frontline === true;

  // Fetch orders
  const scheduleOrders = await fetchScheduleOrders(
    startDate,
    endDate,
    isFrontline ? undefined : vendorId,
    isFrontline ? true : undefined,
  );

  // Determine vendor name and email contacts
  let vendorName = "Frontline";
  let toContacts: Array<{ name: string; email: string }> = [];
  let ccEmails = "";

  if (isFrontline) {
    const [settings] = await db.select({
      frontline_schedule_contacts: company_settings.frontline_schedule_contacts,
    }).from(company_settings).limit(1);
    toContacts = (settings?.frontline_schedule_contacts ?? []) as Array<{ name: string; email: string }>;
  } else if (vendorId) {
    const [vendor] = await db.select({
      name: vendors.name,
      schedule_contacts: vendors.schedule_contacts,
    }).from(vendors).where(eq(vendors.id, vendorId)).limit(1);

    if (!vendor) {
      return new NextResponse("Vendor not found", { status: 404 });
    }
    vendorName = vendor.name;
    const allContacts = (vendor.schedule_contacts ?? []) as Array<{ name: string; email: string; is_primary?: boolean }>;
    const primary = allContacts.filter((c) => c.is_primary);
    toContacts = primary.length > 0 ? primary : allContacts;
    if (primary.length > 0) {
      ccEmails = allContacts.filter((c) => !c.is_primary).map((c) => c.email).filter(Boolean).join(",");
    }
  }

  // Build plain-text schedule body for email
  const scheduleBodyLines: string[] = [];
  for (const o of scheduleOrders) {
    const shipDate = o.ship_date ?? "—";
    const line = isFrontline
      ? `${o.vendorName} | ${o.order_number} | ${o.customerName} | ${o.description ?? "—"} | Qty: ${o.qty ?? "—"} | Ship: ${shipDate}`
      : `${o.order_number} | ${o.customerName} | ${o.description ?? "—"} | Qty: ${o.qty ?? "—"} | Ship: ${shipDate}`;
    scheduleBodyLines.push(line);
  }

  const emailUrl = buildScheduleEmailUrl({
    type: isFrontline ? "frontline" : "vendor",
    vendorName,
    startDate,
    endDate,
    toContacts,
    shipmentCount: scheduleOrders.length,
    scheduleBodyText: scheduleBodyLines.join("\n"),
  });

  // Render PDF
  const generatedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "short",
    timeStyle: "short",
  });

  const pdfBuffer = await renderToBuffer(
    React.createElement(VendorSchedulePdf, {
      startDate,
      endDate,
      orders: scheduleOrders,
      vendorName,
      isFrontline,
      generatedAt,
    }) as React.ReactElement<any>
  );

  const filename = isFrontline
    ? `MPH-Frontline-Schedule-${startDate}-${endDate}.pdf`
    : `MPH-${vendorName}-Schedule-${startDate}-${endDate}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "x-shipment-count": String(scheduleOrders.length),
      "x-email-url": emailUrl,
      "x-email-cc": ccEmails,
    },
  });
}
