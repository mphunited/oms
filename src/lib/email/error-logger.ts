"use client";

export type EmailErrorSeverity = "warning" | "error" | "critical";

export async function logEmailError(
  context: string,
  error: unknown,
  severity: EmailErrorSeverity = "error"
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const status_code = (error as { status?: number })?.status ?? null;
  try {
    await fetch("/api/logs/email-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, message, status_code, severity }),
    });
  } catch {
    console.error("[ErrorLogger] Failed to log:", message);
  }
}
