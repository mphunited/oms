import {
  ShoppingCart,
  Users,
  Truck,
  TrendingUp,
  Receipt,
  UsersRound,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
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
    title: "Team",
    href: "/team",
    icon: UsersRound,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;