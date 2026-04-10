"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/config/nav";
import { useTenant } from "@/hooks/use-tenant";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { TenantSwitcher } from "./tenant-switcher";

export function AppSidebar() {
  const tenant = useTenant();
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const href = `/${tenant}${item.href}`;
                const isActive =
                  item.href === ""
                    ? pathname === `/${tenant}`
                    : pathname.startsWith(href);

                return (
                  <SidebarMenuItem key={item.title}>
                    {/* render= replaces the button element with a Link */}
                    <SidebarMenuButton
                      render={<Link href={href} />}
                      isActive={isActive}
                    >
                      <item.icon
                        className={cn(
                          "size-4",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
