"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/config/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";

type CurrentUser = {
  name: string | null;
  email: string;
  avatar_url: string | null;
} | null;

interface AppSidebarProps {
  currentUser: CurrentUser;
}

export function AppSidebar({ currentUser }: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className={cn(
                        "text-[15px] font-medium rounded-none",
                        isActive
                          ? "border-l-[3px] border-[#E5C678] bg-white/10 text-white font-semibold"
                          : "text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4",
                          isActive ? "text-[#E5C678]" : "text-white/50"
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
        <UserNav user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
