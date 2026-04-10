import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { db } from "@/lib/db";
import { orders, customers, vendors } from "@/lib/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import { ShoppingCart, Users, Building2, TrendingUp } from "lucide-react";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  const [
    [{ value: orderCount }],
    [{ value: customerCount }],
    [{ value: vendorCount }],
    [{ value: activeOrders }],
  ] = await Promise.all([
    db.select({ value: count() }).from(orders).where(eq(orders.company_id, company.id)),
    db.select({ value: count() }).from(customers).where(and(eq(customers.company_id, company.id), eq(customers.is_active, true))),
    db.select({ value: count() }).from(vendors).where(and(eq(vendors.company_id, company.id), eq(vendors.is_active, true))),
    db.select({ value: count() }).from(orders).where(
      and(
        eq(orders.company_id, company.id),
        inArray(orders.status, ["PENDING", "CONFIRMED", "SHIPPED"])
      )
    ),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome to ${company.name}`}
        description="Here's an overview of your operations today."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Orders"
          value={Number(orderCount)}
          description="All time"
          icon={ShoppingCart}
        />
        <StatsCard
          title="Active Orders"
          value={Number(activeOrders)}
          description="Pending · Confirmed · Shipped"
          icon={TrendingUp}
        />
        <StatsCard
          title="Customers"
          value={Number(customerCount)}
          description="Active accounts"
          icon={Users}
        />
        <StatsCard
          title="Vendors"
          value={Number(vendorCount)}
          description="Active suppliers"
          icon={Building2}
        />
      </div>
    </>
  );
}
