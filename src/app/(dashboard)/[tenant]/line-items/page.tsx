// Inventory page — tracks stock levels for vendors/line item context
// In the MPH OMS, inventory is managed at the order line item level.
// This page shows vendor activity as a proxy for inventory awareness.
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
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

  // Show vendors + how many open order line items they have
  const vendors = await prisma.vendor.findMany({
    where: { companyId: company.id, isActive: true },
    include: {
      _count: {
        select: { orderLineItems: true },
      },
    },
    orderBy: { name: "asc" },
  });

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
            {vendors.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No vendors yet.
                </TableCell>
              </TableRow>
            )}
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {vendor.notes ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {vendor._count.orderLineItems}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
