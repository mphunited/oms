// src/app/api/schedules/vendor-pdf/route.ts
// POST /api/schedules/vendor-pdf
// Generates vendor or Frontline schedule PDF.
// Body: { startDate, endDate, vendorId? } for vendor schedule
//       { startDate, endDate, frontline: true } for Frontline schedule
// Returns PDF blob + shipment count + email headers.

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
import { formatDate } from "@/lib/utils/format-date";

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
  let toEmails = "";
  let ccEmails = "";

  if (isFrontline) {
    const [settings] = await db.select({
      frontline_schedule_contacts: company_settings.frontline_schedule_contacts,
    }).from(company_settings).limit(1);
    const contacts = (settings?.frontline_schedule_contacts ?? []) as Array<{ name: string; email: string }>;
    toEmails = contacts.map((c) => c.email).filter(Boolean).join(",");
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
    const toContacts = primary.length > 0 ? primary : allContacts;
    toEmails = toContacts.map((c) => c.email).filter(Boolean).join(",");
    if (primary.length > 0) {
      ccEmails = allContacts.filter((c) => !c.is_primary).map((c) => c.email).filter(Boolean).join(",");
    }
  }

  const subject = isFrontline
    ? `MPH United - Frontline Schedule ${formatDate(startDate)} to ${formatDate(endDate)}`
    : `MPH United - ${vendorName} Schedule ${formatDate(startDate)} to ${formatDate(endDate)}`;

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
      "x-email-to": toEmails,
      "x-email-cc": ccEmails,
      "x-email-subject": subject,
    },
  });
}
