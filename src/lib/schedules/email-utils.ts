// src/lib/schedules/email-utils.ts
// Builds Outlook Web deeplink URLs for schedule email distribution.
// Same deeplink pattern used throughout the app — no mailto:.

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
  scheduleBodyText: string; // Plain-text schedule summary for email body
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
    "A PDF copy is attached to this email.",
    "",
    "— MPH United",
  ].join("\n");

  const params = new URLSearchParams({
    to,
    subject,
    body,
  });

  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}
