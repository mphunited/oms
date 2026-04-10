// Vendors page — replaces the old Products page
// In the MPH OMS, goods are tracked as line items on orders by vendor
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
import { vendors } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function VendorsPage({ params }: VendorsPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  const rows = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.company_id, company.id), eq(vendors.is_active, true)))
    .orderBy(asc(vendors.name));

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Manage your supplier profiles."
        actions={
          <Link
            href={`/${companyId}/vendors/new`}
            className={cn(buttonVariants(), "gap-2")}
          >
            <Plus className="size-4" />
            Add Vendor
          </Link>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
