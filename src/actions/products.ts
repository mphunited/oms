"use server";

// In the MPH OMS, "products" are Vendors. Goods are tracked as line items.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CreateVendorInput } from "@/types/product";

export async function createVendor(companyId: string, input: CreateVendorInput) {
  const vendor = await prisma.vendor.create({
    data: {
      companyId,
      name: input.name,
      address: input.address ?? undefined,
      notes: input.notes,
    },
  });

  revalidatePath("/admin/vendors", "page");
  return vendor;
}

export async function updateVendor(
  vendorId: string,
  input: Partial<CreateVendorInput>
) {
  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      name: input.name,
      address: input.address ?? undefined,
      notes: input.notes,
    },
  });

  revalidatePath("/admin/vendors", "page");
  return vendor;
}

export async function deleteVendor(vendorId: string) {
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { isActive: false },
  });

  revalidatePath("/admin/vendors", "page");
}
