import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { Order } from "@/lib/db/schema";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Address, CustomerContact } from "@/types/customer";

interface CustomerDetailPageProps {
  params: Promise<{ tenant: string; customerId: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { tenant: companyId, customerId } = await params;

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer) notFound();

  const recentOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customer_id, customerId))
    .orderBy(desc(orders.created_at))
    .limit(10);

  const shipTo = customer.ship_to as Address | null;
  const contacts = customer.contacts as CustomerContact[] | null;
  const primaryContact = contacts?.[0];

  return (
    <>
      <PageHeader
        title={customer.name}
        description={primaryContact?.email ?? "No contact on file"}
        actions={
          <Link
            href={`/${companyId}/customers`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ChevronLeft className="size-4" />
            Back
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {primaryContact && (
                <div>
                  <p className="text-muted-foreground">Primary Contact</p>
                  <p className="font-medium">{primaryContact.name}</p>
                  {primaryContact.email && <p>{primaryContact.email}</p>}
                  {primaryContact.phone && <p>{primaryContact.phone}</p>}
                </div>
              )}
              {customer.payment_terms && (
                <div>
                  <p className="text-muted-foreground">Payment Terms</p>
                  <p>{customer.payment_terms}</p>
                </div>
              )}
              {shipTo && (
                <div>
                  <p className="text-muted-foreground">Ship To</p>
                  <p>
                    {[shipTo.street, shipTo.city, shipTo.state, shipTo.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(recentOrders as Order[]).map((order) => (
                    <li key={order.id} className="flex items-center justify-between text-sm">
                      <Link
                        href={`/${companyId}/orders/${order.id}`}
                        className="font-mono hover:underline"
                      >
                        {order.order_number}
                      </Link>
                      <OrderStatusBadge status={order.status as import("@/types/order").OrderStatus} />
                      <span className="text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
