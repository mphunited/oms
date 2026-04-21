import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart,
  Users,
  Truck,
  TrendingUp,
  Receipt,
  UsersRound,
  Settings,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
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
    title: "Financials",
    href: "/financials",
    icon: TrendingUp,
  },
  {
    title: "Invoicing",
    href: "/invoicing",
    icon: Receipt,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      {
        title: "Team",
        href: "/team",
        icon: UsersRound,
      },
    ],
  },
];
