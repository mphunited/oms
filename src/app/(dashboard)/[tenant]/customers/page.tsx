import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import type { Customer } from "@prisma/client";
import type { CustomerContact } from "@/types/customer";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomersPageProps {
  params: Promise<{ tenant: string }>;
}

type CustomerRow = Customer & { _count: { orders: number } };

export default async function CustomersPage({ params }: CustomersPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id, isActive: true },
    include: { _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage your customer accounts."
        actions={
          <Link
            href={`/${companyId}/customers/new`}
            className={cn(buttonVariants(), "gap-2")}
          >
            <Plus className="size-4" />
            Add Customer
          </Link>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
            {(customers as CustomerRow[]).map((customer) => {
              const contacts = customer.contacts as CustomerContact[] | null;
              const primary = contacts?.[0];
              return (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Link
                      href={`/${companyId}/customers/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {primary ? `${primary.name}${primary.email ? ` · ${primary.email}` : ""}` : "—"}
                  </TableCell>
                  <TableCell>{customer.paymentTerms ?? "—"}</TableCell>
                  <TableCell className="text-right">{customer._count.orders}</TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
