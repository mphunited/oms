import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { eq, and, asc, count, sql } from "drizzle-orm";
import { getCompanyById } from "@/lib/tenant/get-tenant";
import type { Customer } from "@/lib/db/schema";
import type { CustomerContact } from "@/types/customer";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomersPageProps {
  params: Promise<{ tenant: string }>;
}

type CustomerRow = Customer & { orderCount: number };

export default async function CustomersPage({ params }: CustomersPageProps) {
  const { tenant: companyId } = await params;
  const company = await getCompanyById(companyId);

  const rows = await db
    .select({
      id: customers.id,
      company_id: customers.company_id,
      name: customers.name,
      contacts: customers.contacts,
      ship_to: customers.ship_to,
      bill_to: customers.bill_to,
      payment_terms: customers.payment_terms,
      is_active: customers.is_active,
      created_at: customers.created_at,
      orderCount: count(orders.id),
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customer_id, customers.id))
    .where(and(eq(customers.company_id, company.id), eq(customers.is_active, true)))
    .groupBy(customers.id)
    .orderBy(asc(customers.name));

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
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
            {(rows as CustomerRow[]).map((customer) => {
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
                  <TableCell>{customer.payment_terms ?? "—"}</TableCell>
                  <TableCell className="text-right">{customer.orderCount}</TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? "default" : "secondary"}>
                      {customer.is_active ? "Active" : "Inactive"}
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
