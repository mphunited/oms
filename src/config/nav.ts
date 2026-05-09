import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  FilePlus,
  RefreshCw,
  Users,
  Truck,
  CalendarDays,
  DollarSign,
  UsersRound,
  Receipt,
  Settings,
  Mail,
  PlusCircle,
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
    title: "New Order",
    href: "/orders/new",
    icon: FilePlus,
  },
  {
    title: "Recycling",
    icon: RefreshCw,
    roles: ["ADMIN", "CSR", "ACCOUNTING", "SALES"],
    children: [
      {
        title: "IBCs",
        href: "/recycling/ibcs",
        icon: RefreshCw,
        roles: ["ADMIN", "CSR", "ACCOUNTING", "SALES"],
      },
      {
        title: "New IBC Order",
        href: "/recycling/ibcs/new",
        icon: FilePlus,
        roles: ["ADMIN", "CSR"],
      },
      {
        title: "Drums",
        href: "/recycling/drums",
        icon: RefreshCw,
        roles: ["ADMIN", "CSR", "ACCOUNTING", "SALES"],
      },
      {
        title: "New Drum Order",
        href: "/recycling/drums/new",
        icon: FilePlus,
        roles: ["ADMIN", "CSR"],
      },
    ],
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
    title: "Global Emails",
    href: "/global-emails",
    icon: Mail,
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
    title: "Invoicing",
    href: "/invoicing",
    icon: Receipt,
    roles: ["ADMIN", "ACCOUNTING"],
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
