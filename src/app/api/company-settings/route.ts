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

  const address = {
    street: body.street ?? existing.address?.street ?? "",
    city: body.city ?? existing.address?.city ?? "",
    state: body.state ?? existing.address?.state ?? "",
    zip: body.zip ?? existing.address?.zip ?? "",
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
      updated_at: new Date(),
    })
    .where(eq(company_settings.id, existing.id));

  const [updated] = await db.select().from(company_settings).limit(1);
  return NextResponse.json(updated);
}
