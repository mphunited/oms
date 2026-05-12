"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navigationGuard } from "@/lib/navigation-guard";
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

type MeData = {
  role: string;
  can_view_commission: boolean;
} | null;

export function AppSidebar({ currentUser }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen } = useSidebar();

  function guardedNavigate(href: string) {
    if (!navigationGuard.confirm()) return
    router.push(href)
  }
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [me, setMe] = useState<MeData>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setMe({ role: data.role, can_view_commission: data.can_view_commission });
      })
      .catch(() => {});
  }, []);

  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const open = new Set<string>();
    for (const item of NAV_ITEMS) {
      if (!item.children) continue;
      const childActive = item.children.some((c) => c.href && pathname.startsWith(c.href));
      if (childActive || (item.href && pathname.startsWith(item.href))) open.add(item.title);
    }
    return open;
  });

  function toggleItem(title: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
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

  function isVisible(item: NavItem): boolean {
    if (!me) return true; // fail open while loading
    if (item.requiresCommission) {
      return me.role === "ADMIN" || me.role === "ACCOUNTING" || me.can_view_commission;
    }
    if (item.roles) {
      return item.roles.includes(me.role);
    }
    return true;
  }

  function renderItem(item: NavItem) {
    if (!isVisible(item)) return null;

    if (item.children?.length) {
      const visibleChildren = item.children.filter(isVisible);
      if (visibleChildren.length === 0) return null;

      const isActive =
        (item.href ? pathname.startsWith(item.href) : false) ||
        visibleChildren.some((c) => c.href && pathname.startsWith(c.href));
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
              {visibleChildren.map((child) => {
                const childActive = child.href ? pathname.startsWith(child.href) : false;
                return (
                  <SidebarMenuSubItem key={child.title}>
                    <SidebarMenuSubButton
                      render={<button onClick={() => child.href && guardedNavigate(child.href)} />}
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

    const isActive = item.href ? pathname.startsWith(item.href) : false;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          render={<button onClick={() => item.href && guardedNavigate(item.href)} />}
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
