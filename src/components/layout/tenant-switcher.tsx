"use client";

import { ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTenant } from "@/hooks/use-tenant";

// In a real app you'd fetch the user's tenants from a server action / context
const MOCK_TENANTS = [
  { slug: "acme", name: "Acme Corp" },
  { slug: "globex", name: "Globex Inc" },
];

export function TenantSwitcher() {
  const currentSlug = useTenant();
  const current = MOCK_TENANTS.find((t) => t.slug === currentSlug);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          {/* render= merges trigger behaviour into SidebarMenuButton */}
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">{current?.name ?? currentSlug}</span>
              <span className="text-xs text-muted-foreground">Switch workspace</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {MOCK_TENANTS.map((t) => (
              /* render= makes the item an anchor tag */
              <DropdownMenuItem key={t.slug} render={<a href={`/${t.slug}`} />}>
                {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
