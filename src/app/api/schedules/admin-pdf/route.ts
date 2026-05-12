// src/app/api/schedules/admin-pdf/route.ts
// POST /api/schedules/admin-pdf
// Generates admin schedule PDF. Returns PDF blob + shipment count + email headers.
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
import { formatDate } from "@/lib/utils/format-date";

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
  const toEmails = recipients.map((r) => r.email).filter(Boolean).join(",");
  const subject = `MPH United - Mike's Schedule ${formatDate(startDate)} to ${formatDate(endDate)}`;

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
    }) as React.ReactElement
  );

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MPH-Admin-Schedule-${startDate}-${endDate}.pdf"`,
      "x-shipment-count": String(orders.length),
      "x-email-to": toEmails,
      "x-email-cc": "",
      "x-email-subject": subject,
    },
  });
}
