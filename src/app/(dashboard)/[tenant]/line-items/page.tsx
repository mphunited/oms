// Inventory page — tracks stock levels for vendors/line item context
// In the MPH OMS, inventory is managed at the order line item level.
// This page shows vendor activity as a proxy for inventory awareness.
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { vendors, order_line_items } from "@/lib/db/schema";
import { eq, and, asc, count } from "drizzle-orm";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface InventoryPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  // Show vendors + how many order line items they have
  const rows = await db
    .select({
      id: vendors.id,
      name: vendors.name,
      notes: vendors.notes,
      lineItemCount: count(order_line_items.id),
    })
    .from(vendors)
    .leftJoin(order_line_items, eq(order_line_items.vendor_id, vendors.id))
    .where(and(eq(vendors.company_id, company.id), eq(vendors.is_active, true)))
    .groupBy(vendors.id)
    .orderBy(asc(vendors.name));

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Vendor activity and order line item summary."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Line Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No vendors yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {vendor.notes ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {Number(vendor.lineItemCount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
