import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { Order, Customer } from "@prisma/client";
import Link from "next/link";
import { Plus, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrdersPageProps {
  params: Promise<{ tenant: string }>;
}

type OrderRow = Order & { customer: Pick<Customer, "id" | "name"> };

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  const orders = await prisma.order.findMany({
    where: { companyId: company.id },
    include: {
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Manage and track all customer orders."
        actions={
          <Link
            href={`/${companyId}/orders/new`}
            className={cn(buttonVariants(), "gap-2")}
          >
            <Plus className="size-4" />
            New Order
          </Link>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>CSR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ship Date</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No orders yet. Create your first order.
                </TableCell>
              </TableRow>
            )}
            {(orders as OrderRow[]).map((order) => (
              <TableRow key={order.id} className="hover:bg-muted/50">
                <TableCell>
                  <Link
                    href={`/${companyId}/orders/${order.id}`}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  {order.customer.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.salesperson ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.csr ?? "—"}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {order.shipDate ? new Date(order.shipDate).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {order.flag && (
                    <Flag className="size-4 text-red-500" aria-label="Flagged" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
