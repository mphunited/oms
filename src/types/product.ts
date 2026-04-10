// In the MPH OMS, goods are tracked as line items on orders supplied by Vendors.
export type { Vendor } from "@/lib/db/schema";

export interface CreateVendorInput {
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  notes?: string;
}
