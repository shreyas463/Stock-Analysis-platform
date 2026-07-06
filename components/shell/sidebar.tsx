"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  ArrowLeftRightIcon,
  BellIcon,
  CandlestickChartIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  ListIcon,
  NewspaperIcon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BasisWordmark } from "@/components/shell/logo";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAV_SECTIONS: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboardIcon },
      { href: "/markets", label: "Markets", icon: ActivityIcon },
      { href: "/news", label: "News", icon: NewspaperIcon },
    ],
  },
  {
    title: "Research",
    items: [
      { href: "/research", label: "Stock Research", icon: LineChartIcon },
      { href: "/watchlists", label: "Watchlists", icon: ListIcon },
    ],
  },
  {
    title: "Trading",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: CandlestickChartIcon },
      { href: "/trade", label: "Paper Trading", icon: ArrowLeftRightIcon },
      { href: "/alerts", label: "Alerts", icon: BellIcon },
    ],
  },
];

export function Sidebar({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="flex h-full flex-col gap-1 overflow-y-auto scrollbar-thin bg-panel px-3 py-4"
    >
      <Link href="/" className="mb-4 px-2" onClick={onNavigate}>
        <BasisWordmark />
      </Link>

      {NAV_SECTIONS.map((section, i) => (
        <div key={i} className="mb-2">
          {section.title && !collapsed && (
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-ink-muted hover:bg-panel-2 hover:text-ink",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto">
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-brand-soft text-brand"
              : "text-ink-muted hover:bg-panel-2 hover:text-ink",
          )}
        >
          <SettingsIcon className="size-4" />
          {!collapsed && "Settings"}
        </Link>
        <p className="mt-3 px-2 text-[10px] leading-relaxed text-ink-faint">
          Paper trading & education only. Not financial advice.
        </p>
      </div>
    </nav>
  );
}
