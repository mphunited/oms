import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/order";

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  "Pending":                        { label: "Pending",                        variant: "secondary" },
  "Waiting On Vendor To Confirm":   { label: "Waiting On Vendor To Confirm",   variant: "outline" },
  "Waiting To Confirm To Customer": { label: "Waiting To Confirm To Customer", variant: "outline" },
  "Confirmed To Customer":          { label: "Confirmed To Customer",          variant: "default" },
  "Rinse And Return Stage":         { label: "Rinse And Return Stage",         variant: "secondary" },
  "Sent Order To Carrier":          { label: "Sent Order To Carrier",          variant: "default" },
  "Ready To Ship":                  { label: "Ready To Ship",                  variant: "default" },
  "Ready To Invoice":               { label: "Ready To Invoice",               variant: "default" },
  "Complete":                       { label: "Complete",                       variant: "default" },
  "Cancelled":                      { label: "Cancelled",                      variant: "destructive" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
