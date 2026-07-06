"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";
import { post } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SettingsClient({
  email,
  username,
  demoMode,
  finnhubConfigured,
  stooqEnabled,
}: {
  email: string;
  username: string;
  demoMode: boolean;
  finnhubConfigured: boolean;
  stooqEnabled: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);
  const queryClient = useQueryClient();
  React.useEffect(() => setMounted(true), []);

  async function resetPortfolio() {
    setResetting(true);
    try {
      await post("/api/portfolio/reset", {});
      queryClient.invalidateQueries();
      toast.success("Paper portfolio reset to $100,000");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: MonitorIcon },
  ] as const;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your Basis identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Username</span>
            <span className="font-medium">@{username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">Email</span>
            <span className="font-medium">{email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme preference is saved on this device</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={mounted && theme === opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-xs font-medium transition-colors",
                  mounted && theme === opt.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                <opt.icon className="size-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market data</CardTitle>
          <CardDescription>
            Providers are configured with server-side environment variables — keys never reach the
            browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mode</p>
              <p className="text-xs text-ink-muted">
                {demoMode
                  ? "Demo — deterministic synthetic prices, clearly labeled"
                  : "Live — quotes from Finnhub, history from Stooq"}
              </p>
            </div>
            <Badge variant={demoMode ? "warn" : "pos"}>{demoMode ? "Demo" : "Live"}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Finnhub (quotes, news, fundamentals)</p>
              <p className="text-xs text-ink-muted">
                Set <code className="font-mono">FINNHUB_API_KEY</code> in{" "}
                <code className="font-mono">.env.local</code> and restart
              </p>
            </div>
            {finnhubConfigured ? (
              <CheckCircle2Icon className="size-4 text-pos" />
            ) : (
              <CircleAlertIcon className="size-4 text-warn" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Stooq (daily price history)</p>
              <p className="text-xs text-ink-muted">Free end-of-day candles, no key required</p>
            </div>
            {stooqEnabled && !demoMode ? (
              <CheckCircle2Icon className="size-4 text-pos" />
            ) : (
              <Badge variant="secondary">{demoMode ? "unused in demo" : "disabled"}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-neg/30">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>These actions cannot be undone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Reset paper portfolio</p>
              <p className="text-xs text-ink-muted">
                Deletes all positions, orders and history; restores $100,000 paper cash.
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Reset portfolio
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset paper portfolio?</DialogTitle>
                  <DialogDescription>
                    All positions, orders, trades and performance history will be permanently
                    deleted, and your paper cash returns to $100,000.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive" onClick={resetPortfolio} disabled={resetting}>
                      {resetting ? "Resetting…" : "Yes, reset everything"}
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <p className="px-1 text-[11px] leading-relaxed text-ink-faint">
        Basis is an educational paper-trading platform. Nothing here is financial advice. In demo
        mode all prices are synthetic and labeled as such; with live keys, quotes may still be
        delayed by your data plan.
      </p>
    </div>
  );
}
