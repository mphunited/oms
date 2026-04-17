export type { Order, OrderSplitLoad, BillOfLading } from "@/lib/db/schema";
export type { Customer, Vendor } from "@/lib/db/schema";

export type OrderStatus =
  | 'Pending'
  | 'Waiting On Vendor To Confirm'
  | 'Waiting To Confirm To Customer'
  | 'Confirmed To Customer'
  | 'Rinse And Return Stage'
  | 'Sent Order To Carrier'
  | 'Ready To Ship'
  | 'Ready To Invoice'
  | 'Complete'
  | 'Cancelled';

import type { Order, OrderSplitLoad, Customer, BillOfLading } from "@/lib/db/schema";

export interface OrderRow extends Order {
  customer: Pick<Customer, "id" | "name">;
  splitLoads: OrderSplitLoad[];
}

export interface OrderWithRelations extends Order {
  customer: Customer;
  splitLoads: OrderSplitLoad[];
  billOfLading: BillOfLading | null;
}

export interface CreateOrderInput {
  customerId: string;
  vendorId?: string;
  salespersonId?: string;
  csrId?: string;
  orderType?: string;
  orderDate?: Date;
  shipDate?: Date;
  wantedDate?: Date;
  customerPo?: string;
  splitLoads: {
    description?: string;
    partNumber?: string;
    qty?: number;
    buy?: number;
    sell?: number;
  }[];
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: string;
  flag?: boolean;
}
