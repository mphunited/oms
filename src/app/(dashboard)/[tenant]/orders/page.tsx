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
import { db } from "@/lib/db";
import { orders, customers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { Order, Customer } from "@/lib/db/schema";
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

  const rows = await db
    .select({
      id: orders.id,
      company_id: orders.company_id,
      order_number: orders.order_number,
      customer_id: orders.customer_id,
      status: orders.status,
      salesperson: orders.salesperson,
      csr: orders.csr,
      ship_date: orders.ship_date,
      delivery_date: orders.delivery_date,
      customer_po: orders.customer_po,
      freight_carrier: orders.freight_carrier,
      appointment_time: orders.appointment_time,
      appointment_notes: orders.appointment_notes,
      po_notes: orders.po_notes,
      freight_notes: orders.freight_notes,
      shipper_notes: orders.shipper_notes,
      misc_notes: orders.misc_notes,
      terms: orders.terms,
      notes: orders.notes,
      flag: orders.flag,
      created_at: orders.created_at,
      updated_at: orders.updated_at,
      customer: {
        id: customers.id,
        name: customers.name,
      },
    })
    .from(orders)
    .leftJoin(customers, eq(customers.id, orders.customer_id))
    .where(eq(orders.company_id, company.id))
    .orderBy(desc(orders.created_at))
    .limit(100);

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
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No orders yet. Create your first order.
                </TableCell>
              </TableRow>
            )}
            {rows.map((order) => (
              <TableRow key={order.id} className="hover:bg-muted/50">
                <TableCell>
                  <Link
                    href={`/${companyId}/orders/${order.id}`}
                    className="font-mono text-sm font-medium hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  {order.customer?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.salesperson ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.csr ?? "—"}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status as import("@/types/order").OrderStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {order.ship_date ? new Date(order.ship_date).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(order.created_at).toLocaleDateString()}
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
