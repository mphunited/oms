"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/config/nav";
import type { NavItem } from "@/config/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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

  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const open = new Set<string>();
    for (const item of NAV_ITEMS) {
      if (!item.children) continue;
      const childActive = item.children.some((c) => pathname.startsWith(c.href));
      if (childActive || pathname.startsWith(item.href)) open.add(item.title);
    }
    return open;
  });

  function toggleItem(title: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  }

  function renderItem(item: NavItem) {
    if (item.children?.length) {
      const isActive =
        pathname.startsWith(item.href) ||
        item.children.some((c) => pathname.startsWith(c.href));
      const isOpen = openItems.has(item.title);

      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            onClick={() => toggleItem(item.title)}
            isActive={isActive}
            className={cn(
              "text-[15px] font-medium rounded-none",
              isActive
                ? "border-l-[3px] border-[#E5C678] bg-white/10 text-white font-semibold"
                : "text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent"
            )}
          >
            <item.icon
              className={cn("size-4", isActive ? "text-[#E5C678]" : "text-white/50")}
            />
            <span>{item.title}</span>
            <ChevronDown
              className={cn(
                "ml-auto size-4 shrink-0 transition-transform duration-200 text-white/50",
                isOpen && "rotate-180"
              )}
            />
          </SidebarMenuButton>

          {isOpen && (
            <SidebarMenuSub>
              {item.children.map((child) => {
                const childActive = pathname.startsWith(child.href);
                return (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton
                      render={<Link href={child.href} />}
                      isActive={childActive}
                      className={cn(
                        "text-[14px] font-medium",
                        childActive
                          ? "text-white font-semibold"
                          : "text-white/70 hover:text-white"
                      )}
                    >
                      <child.icon
                        className={cn(
                          "size-4",
                          childActive ? "text-[#E5C678]" : "text-white/50"
                        )}
                      />
                      <span>{child.title}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          )}
        </SidebarMenuItem>
      );
    }

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
            className={cn("size-4", isActive ? "text-[#E5C678]" : "text-white/50")}
          />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
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
            <SidebarMenu>{NAV_ITEMS.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserNav user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
