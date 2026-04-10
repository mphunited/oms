import type {
  Order,
  OrderLineItem,
  OrderStatus,
  Customer,
  Vendor,
  Invoice,
  BillOfLading,
} from "@prisma/client";

export type { Order, OrderLineItem, OrderStatus, Invoice, BillOfLading };

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
