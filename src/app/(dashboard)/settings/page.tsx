import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CarriersSection } from "@/components/settings/carriers-section";
import { OrderStatusesSection } from "@/components/settings/order-statuses-section";
import { CompanySettingsSection } from "@/components/settings/company-settings-section";
import { OrderNumberSection } from "@/components/settings/order-number-section";
import { OrderTypesSection } from "@/components/settings/order-types-section";
import { ProductWeightsSection } from "@/components/settings/product-weights-section";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [me] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!me || me.role !== "ADMIN") redirect("/");

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#00205B]">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Admin configuration for MPH United OMS.
        </p>
      </div>
      <CompanySettingsSection />
      <OrderNumberSection />
      <CarriersSection />
      <OrderStatusesSection />
      <OrderTypesSection />
      <ProductWeightsSection />
    </div>
  );
}
