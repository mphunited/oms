// src/lib/schedules/email-utils.ts
// Builds schedule email data for Graph API draft creation.

interface EmailContact {
  name: string;
  email: string;
}

interface ScheduleEmailParams {
  type: "admin" | "vendor" | "frontline";
  vendorName?: string;
  startDate: string;
  endDate: string;
  toContacts: EmailContact[];
  shipmentCount: number;
  scheduleBodyText: string;
}

export function buildScheduleEmailUrl({
  type,
  vendorName,
  startDate,
  endDate,
  toContacts,
  shipmentCount,
  scheduleBodyText,
}: ScheduleEmailParams): string {
  const to = toContacts.map((c) => c.email).join(";");

  const subjectMap = {
    admin: `MPH United — Admin Schedule ${startDate} to ${endDate}`,
    vendor: `MPH United — ${vendorName ?? "Vendor"} Schedule ${startDate} to ${endDate}`,
    frontline: `MPH United — Frontline Schedule ${startDate} to ${endDate}`,
  };
  const subject = subjectMap[type];

  const body = [
    `Please find the attached shipping schedule for ${startDate} through ${endDate}.`,
    `Total Shipments: ${shipmentCount}`,
    "",
    scheduleBodyText,
    "",
    "— MPH United",
  ].join("\n");

  const params = new URLSearchParams({ to, subject, body });
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

export interface ScheduleEmailDraft {
  to: string[];
  cc: string[];
  subject: string;
  bodyHtml: string;
}

export function parseScheduleEmailUrl(url: string): ScheduleEmailDraft {
  const searchParams = new URLSearchParams(new URL(url).search);
  const to = (searchParams.get("to") ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const subject = searchParams.get("subject") ?? "";
  const rawBody = searchParams.get("body") ?? "";
  const escaped = rawBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  const bodyHtml = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">${escaped}</div>`;
  return { to, cc: [], subject, bodyHtml };
}
