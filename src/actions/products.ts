"use server";

// In the MPH OMS, "products" are Vendors. Goods are tracked as line items.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CreateVendorInput } from "@/types/product";

export async function createVendor(companyId: string, input: CreateVendorInput) {
  const [vendor] = await db.insert(vendors).values({
    company_id: companyId,
    name: input.name,
    address: input.address ?? null,
    notes: input.notes,
  }).returning();

  revalidatePath("/admin/vendors", "page");
  return vendor;
}

export async function updateVendor(
  vendorId: string,
  input: Partial<CreateVendorInput>
) {
  const [vendor] = await db.update(vendors)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.notes !== undefined && { notes: input.notes }),
    })
    .where(eq(vendors.id, vendorId))
    .returning();

  revalidatePath("/admin/vendors", "page");
  return vendor;
}

export async function deleteVendor(vendorId: string) {
  await db.update(vendors)
    .set({ is_active: false })
    .where(eq(vendors.id, vendorId));

  revalidatePath("/admin/vendors", "page");
}
