"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import Image from "next/image";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="inline-flex items-center gap-1.5 px-2 h-8 rounded-md hover:bg-white/10 transition-colors text-white/80 hover:text-white"
    >
      <span className="relative inline-flex size-4 shrink-0">
        <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </span>
      <span className="text-sm text-white/80">
        {theme === "dark" ? "Dark Mode" : "Light Mode"}
      </span>
    </button>
  );
}

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-4 bg-[#00205B] text-white">
      <div className="flex-shrink-0 mr-2">
        <Image
          src="/mph-logo.png"
          width={120}
          height={36}
          alt="MPH United"
          className="object-contain"
          style={{ height: 36, width: "auto" }}
          priority
        />
      </div>
      <SidebarTrigger className="-ml-1 text-white/80 hover:text-white hover:bg-white/10" />
      <Separator orientation="vertical" className="h-4 bg-white/20" />
      <h1 className="text-base font-semibold text-white">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  );
}
