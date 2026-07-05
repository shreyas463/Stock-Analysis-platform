"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  CheckCheckIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { api, post } from "@/lib/client";
import { cn, relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/misc";
import { CommandPalette } from "@/components/shell/command-palette";

type MarketStatusData = {
  open: boolean;
  session: "pre" | "regular" | "after" | "closed";
  demoMode: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: number | null;
  createdAt: number;
};

export function Topbar({ username, onMenuClick }: { username: string; onMenuClick: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const { data: status } = useQuery({
    queryKey: ["market-status"],
    queryFn: () => api<MarketStatusData>("/api/market/status"),
    refetchInterval: 60_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: NotificationItem[] }>("/api/notifications"),
    refetchInterval: 60_000,
  });

  const unread = notifications?.notifications.filter((n) => !n.readAt).length ?? 0;

  async function logout() {
    await post("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  }

  async function markAllRead() {
    await post("/api/notifications/read-all", {});
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const sessionLabel =
    status?.session === "regular"
      ? "Market open"
      : status?.session === "pre"
        ? "Pre-market"
        : status?.session === "after"
          ? "After hours"
          : "Market closed";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-panel/95 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <MenuIcon />
      </Button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-line bg-panel-2 px-3 text-sm text-ink-faint transition-colors hover:border-line-strong"
        aria-label="Search stocks (Cmd+K)"
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">Search stocks…</span>
        <kbd className="ml-auto hidden rounded border border-line bg-panel px-1.5 py-0.5 text-[10px] sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {status?.demoMode && (
          <Badge variant="warn" className="hidden sm:inline-flex">
            Demo mode · synthetic data
          </Badge>
        )}
        <span className="hidden items-center gap-1.5 text-xs text-ink-muted md:flex">
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              status?.open ? "bg-pos" : "bg-ink-faint",
            )}
            aria-hidden
          />
          {sessionLabel}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Notifications (${unread} unread)`}
              className="relative"
            >
              <BellIcon />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-3.5 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-brand hover:underline"
                >
                  <CheckCheckIcon className="size-3" /> Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            {(notifications?.notifications ?? []).length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-ink-muted">No notifications yet</p>
            ) : (
              notifications!.notifications.slice(0, 8).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => n.href && router.push(n.href)}
                  className={cn("flex-col items-start gap-0.5", !n.readAt && "bg-brand-soft/40")}
                >
                  <span className="text-xs font-medium">{n.title}</span>
                  {n.body && (
                    <span className="line-clamp-2 text-[11px] text-ink-muted">{n.body}</span>
                  )}
                  <span className="text-[10px] text-ink-faint">{relativeTime(n.createdAt)}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                {username.slice(0, 1).toUpperCase()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>@{username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOutIcon /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
