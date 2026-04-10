import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  List,
  TrendingUp,
  Receipt,
  FileStack,
  MessageSquare,
  BookOpen,
  UsersRound,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "",
    icon: LayoutDashboard,
  },
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
    title: "Line Items",
    href: "/line-items",
    icon: List,
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
    title: "Bills of Lading",
    href: "/bills-of-lading",
    icon: FileStack,
  },
  {
    title: "Forum",
    href: "/forum",
    icon: MessageSquare,
  },
  {
    title: "Resources",
    href: "/resources",
    icon: BookOpen,
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
