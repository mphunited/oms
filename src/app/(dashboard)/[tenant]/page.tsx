import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { prisma } from "@/lib/prisma";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import { ShoppingCart, Users, Building2, TrendingUp } from "lucide-react";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  const [orderCount, customerCount, vendorCount, activeOrders] = await Promise.all([
    prisma.order.count({ where: { companyId: company.id } }),
    prisma.customer.count({ where: { companyId: company.id, isActive: true } }),
    prisma.vendor.count({ where: { companyId: company.id, isActive: true } }),
    prisma.order.count({
      where: {
        companyId: company.id,
        status: { in: ["PENDING", "IN_PROGRESS", "SHIPPED"] },
      },
    }),
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
          value={orderCount}
          description="All time"
          icon={ShoppingCart}
        />
        <StatsCard
          title="Active Orders"
          value={activeOrders}
          description="Pending · In Progress · Shipped"
          icon={TrendingUp}
        />
        <StatsCard
          title="Customers"
          value={customerCount}
          description="Active accounts"
          icon={Users}
        />
        <StatsCard
          title="Vendors"
          value={vendorCount}
          description="Active suppliers"
          icon={Building2}
        />
      </div>
    </>
  );
}
