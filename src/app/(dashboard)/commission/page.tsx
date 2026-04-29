// src/app/(dashboard)/commission/page.tsx
// Commission report page.
// SALES role: sees only their own orders.
// ADMIN and ACCOUNTING: see all orders.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CommissionClient } from "@/components/commission/commission-client";

export const metadata = { title: "Commission Report — MPH United" };

export default async function CommissionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [dbUser] = await db
    .select({ role: users.role, can_view_commission: users.can_view_commission })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) redirect("/dashboard");

  if (dbUser.role === "SALES" && !dbUser.can_view_commission) {
    redirect("/dashboard");
  }

  return <CommissionClient />;
}
