"use client";

import { useParams } from "next/navigation";

/**
 * Returns the current tenant slug from the URL params.
 * Must be used inside a route that has a [tenant] segment.
 */
export function useTenant(): string {
  const params = useParams<{ tenant: string }>();
  return params.tenant;
}
