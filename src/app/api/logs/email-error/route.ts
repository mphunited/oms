import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { email_errors } from "@/lib/db/schema";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { context?: string; message?: string; status_code?: number | null; severity?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { context, message, status_code, severity } = body;
  if (!context || !message) {
    return NextResponse.json({ error: "context and message are required" }, { status: 400 });
  }

  try {
    await db.insert(email_errors).values({
      user_id: session.user.id,
      context,
      message,
      status_code: status_code ?? null,
      severity: (severity as "warning" | "error" | "critical") ?? "error",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email-error] DB insert failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
