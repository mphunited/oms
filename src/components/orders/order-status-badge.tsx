import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/order";

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  QUOTE:       { label: "Quote",       variant: "outline" },
  PENDING:     { label: "Pending",     variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  SHIPPED:     { label: "Shipped",     variant: "default" },
  DELIVERED:   { label: "Delivered",   variant: "default" },
  CANCELLED:   { label: "Cancelled",   variant: "destructive" },
  ON_HOLD:     { label: "On Hold",     variant: "secondary" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
