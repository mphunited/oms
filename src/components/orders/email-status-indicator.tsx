"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export type EmailOperationStatus =
  | "idle"
  | "acquiring_token"
  | "building_email"
  | "creating_draft"
  | "attaching_pdf"
  | "success"
  | "error";

export function EmailStatusIndicator({
  status,
  error,
}: {
  status: EmailOperationStatus;
  error?: string;
}) {
  if (status === "idle") return null;

  const spinner = <Loader2 className="h-3.5 w-3.5 animate-spin" />;

  const content: Record<Exclude<EmailOperationStatus, "idle">, React.ReactNode> = {
    acquiring_token: <>{spinner} Getting Outlook permissions…</>,
    building_email: <>{spinner} Building email…</>,
    creating_draft: <>{spinner} Creating draft…</>,
    attaching_pdf: <>{spinner} Attaching PDF…</>,
    success: (
      <>
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        Draft created — opening Outlook
      </>
    ),
    error: (
      <>
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        {error ?? "Something went wrong"}
      </>
    ),
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      {content[status]}
    </span>
  );
}
