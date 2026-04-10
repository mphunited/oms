import { PageHeader } from "@/components/shared/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewOrderPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function NewOrderPage({ params }: NewOrderPageProps) {
  const { tenant: slug } = await params;

  return (
    <>
      <PageHeader
        title="New Order"
        description="Create a new customer order."
        actions={
          <Link
            href={`/${slug}/orders`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ChevronLeft className="size-4" />
            Back
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <CardDescription>Select or search for a customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Input id="customer" placeholder="Search customers…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Add products to this order</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">
                + Add product
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Internal notes about this order…"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-3">
                <span>Total</span>
                <span>$0.00</span>
              </div>
              <Button className="w-full mt-2">Create Order</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
