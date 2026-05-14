import type { LucideIcon } from "lucide-react";
import {
  Gauge,
  FileStack,
  FilePlus,
  RefreshCcw,
  Building2,
  Warehouse,
  CalendarDays,
  CircleDollarSign,
  UsersRound,
  FileCheck2,
  SlidersHorizontal,
  AtSign,
  BarChart2,
  TrendingUp,
  Activity,
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
    icon: Gauge,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: FileStack,
  },
  {
    title: "New Order",
    href: "/orders/new",
    icon: FilePlus,
  },
  {
    title: "Recycling",
    icon: RefreshCcw,
    roles: ["ADMIN", "CSR", "ACCOUNTING", "SALES"],
    children: [
      {
        title: "IBCs",
        href: "/recycling/ibcs",
        icon: RefreshCcw,
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
        icon: RefreshCcw,
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
    icon: Building2,
  },
  {
    title: "Vendors",
    href: "/vendors",
    icon: Warehouse,
  },
  {
    title: "Global Emails",
    href: "/global-emails",
    icon: AtSign,
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
    icon: CircleDollarSign,
    requiresCommission: true,
  },
  {
    title: "Invoicing",
    href: "/invoicing",
    icon: FileCheck2,
    roles: ["ADMIN", "ACCOUNTING"],
  },
  {
    title: "Product Totals",
    href: "/product-totals",
    icon: BarChart2,
    roles: ["ADMIN", "ACCOUNTING"],
  },
  {
    title: "Margins",
    href: "/margins",
    icon: TrendingUp,
    roles: ["ADMIN", "ACCOUNTING", "SALES"],
  },
  {
    title: "Order Frequency",
    href: "/order-frequency",
    icon: Activity,
    roles: ["ADMIN", "ACCOUNTING", "SALES"],
  },
  {
    title: "Settings",
    icon: SlidersHorizontal,
    children: [
      {
        title: "General",
        href: "/settings",
        icon: SlidersHorizontal,
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
