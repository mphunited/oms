import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { company_settings, users } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db.select().from(company_settings).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [me] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const [existing] = await db.select().from(company_settings).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existingAddress = (existing.address ?? {}) as { street?: string; city?: string; state?: string; zip?: string };

  const address = {
    street: body.street ?? existingAddress.street ?? "",
    city: body.city ?? existingAddress.city ?? "",
    state: body.state ?? existingAddress.state ?? "",
    zip: body.zip ?? existingAddress.zip ?? "",
  };

  const logo_url = body.logo_url?.trim() || existing.logo_url;

  await db
    .update(company_settings)
    .set({
      name: body.name ?? existing.name,
      legal_name: body.legal_name ?? existing.legal_name,
      address,
      email: body.email ?? existing.email,
      phone: body.phone ?? existing.phone,
      logo_url,
      admin_schedule_recipients: body.admin_schedule_recipients ?? existing.admin_schedule_recipients,
      frontline_schedule_contacts: body.frontline_schedule_contacts ?? existing.frontline_schedule_contacts,
      updated_at: new Date(),
    })
    .where(eq(company_settings.id, existing.id));

  const [updated] = await db.select().from(company_settings).limit(1);
  return NextResponse.json(updated);
}
