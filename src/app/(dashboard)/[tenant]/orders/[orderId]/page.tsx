import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { OrderLineItem, Vendor, Customer } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailPageProps {
  params: Promise<{ tenant: string; orderId: string }>;
}

type LineItemRow = OrderLineItem & { vendor: Vendor | null };

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { tenant: companyId, orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      lineItems: { include: { vendor: true } },
      invoice: true,
      billOfLading: true,
    },
  });

  if (!order) notFound();

  // Compute totals from line items
  const subtotal = order.lineItems.reduce(
    (sum, li) => sum + Number(li.sellEach) * Number(li.qty),
    0
  );
  const freight = order.lineItems.reduce(
    (sum, li) => sum + Number(li.freightCost),
    0
  );

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Created ${new Date(order.createdAt).toLocaleDateString()}`}
        actions={
          <Link
            href={`/${companyId}/orders`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ChevronLeft className="size-4" />
            Back to Orders
          </Link>
        }
      />

      <div className="flex gap-3 items-center">
        <OrderStatusBadge status={order.status} />
        {order.flag && (
          <Badge variant="destructive" className="gap-1">
            <Flag className="size-3" /> Flagged
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Buy Each</TableHead>
                    <TableHead className="text-right">Sell Each</TableHead>
                    <TableHead className="text-right">Freight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.lineItems as LineItemRow[]).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.vendor?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">{Number(item.qty)}</TableCell>
                      <TableCell className="text-right">${Number(item.buyEach).toFixed(4)}</TableCell>
                      <TableCell className="text-right">${Number(item.sellEach).toFixed(4)}</TableCell>
                      <TableCell className="text-right">${Number(item.freightCost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{(order.customer as Customer).name}</p>
              {order.salesperson && (
                <p className="text-muted-foreground">Sales: {order.salesperson}</p>
              )}
              {order.csr && (
                <p className="text-muted-foreground">CSR: {order.csr}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Dates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.shipDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ship Date</span>
                  <span>{new Date(order.shipDate).toLocaleDateString()}</span>
                </div>
              )}
              {order.deliveryDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{new Date(order.deliveryDate).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (sell)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freight</span>
                <span>${freight.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>${(subtotal + freight).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
