export type { Order, OrderLineItem } from "@/lib/db/schema";
export type { Invoice, BillOfLading } from "@/lib/db/schema";
export type { Customer, Vendor } from "@/lib/db/schema";

export type OrderStatus = 'QUOTE' | 'PENDING' | 'IN_PROGRESS' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';

import type { Order, OrderLineItem, Customer, Vendor, Invoice, BillOfLading } from "@/lib/db/schema";

export interface OrderRow extends Order {
  customer: Pick<Customer, "id" | "name">;
  lineItems: OrderLineItem[];
}

export interface OrderWithRelations extends Order {
  customer: Customer;
  lineItems: (OrderLineItem & { vendor: Vendor | null })[];
  invoice: Invoice | null;
  billOfLading: BillOfLading | null;
}

export interface CreateOrderInput {
  customerId: string;
  salesperson?: string;
  csr?: string;
  notes?: string;
  shipDate?: Date;
  deliveryDate?: Date;
  lineItems: {
    vendorId?: string;
    description: string;
    qty: number;
    buyEach: number;
    sellEach: number;
    freightCost?: number;
    splitLoad?: boolean;
  }[];
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  flag?: boolean;
}
