import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  RefreshCw,
  Users,
  Truck,
  CalendarDays,
  DollarSign,
  UsersRound,
  Settings,
} from "lucide-react";

export type NavItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  roles?: string[];
  requiresCommission?: boolean;
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Recycling",
    href: "/recycling",
    icon: RefreshCw,
    roles: ["ADMIN", "CSR", "ACCOUNTING"],
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Vendors",
    href: "/vendors",
    icon: Truck,
  },
  {
    title: "Schedules",
    href: "/schedules",
    icon: CalendarDays,
    roles: ["ADMIN", "CSR", "ACCOUNTING"],
  },
  {
    title: "Commission",
    href: "/commission",
    icon: DollarSign,
    requiresCommission: true,
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      {
        title: "General",
        href: "/settings",
        icon: Settings,
        roles: ["ADMIN"],
      },
      {
        title: "Team",
        href: "/team",
        icon: UsersRound,
        roles: ["ADMIN"],
      },
    ],
  },
];
