"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRingIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { api, del, patch, ApiClientError } from "@/lib/client";
import { fmtCents } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/misc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/format";
import { PageHeader } from "@/components/page-header";
import {
  conditionSentence,
  type AlertKind,
  type AlertRow,
  type AlertsResponse,
} from "./alert-kinds";
import { NewAlertDialog } from "./new-alert-dialog";

const PRICE_KINDS: AlertKind[] = ["price_above", "price_below", "pct_move", "drawdown"];
const RSI_KINDS: AlertKind[] = ["rsi_above", "rsi_below"];

function readingText(alert: AlertRow): string {
  if (alert.currentReading === null) return "—";
  if (PRICE_KINDS.includes(alert.kind)) return fmtCents(alert.currentReading, { precise: true });
  if (RSI_KINDS.includes(alert.kind)) return `RSI ${alert.currentReading}`;
  return "—";
}

function DeleteAlertButton({ alert }: { alert: AlertRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const remove = useMutation({
    mutationFn: () => del(`/api/alerts?id=${alert.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setOpen(false);
    },
    onError: (err) =>
      toast.error(err instanceof ApiClientError ? err.message : "Could not delete the alert"),
  });

  return (
    <>
      <Button variant="ghost" size="iconSm" aria-label="Delete alert" onClick={() => setOpen(true)}>
        <Trash2Icon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this alert?</DialogTitle>
            <DialogDescription>
              {alert.symbol ? `${alert.symbol}: ` : ""}
              {conditionSentence(alert.kind, alert.threshold)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AlertsView() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api<AlertsResponse>("/api/alerts"),
    refetchInterval: 60_000,
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      patch("/api/alerts", { id, enabled }),
    // Optimistic flip — reverted on failure.
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["alerts"] });
      const previous = queryClient.getQueryData<AlertsResponse>(["alerts"]);
      queryClient.setQueryData<AlertsResponse>(["alerts"], (old) =>
        old ? { alerts: old.alerts.map((a) => (a.id === id ? { ...a, enabled } : a)) } : old,
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["alerts"], ctx.previous);
      toast.error(err instanceof ApiClientError ? err.message : "Could not update the alert");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const alerts = data?.alerts ?? [];

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Alerts are evaluated while you use the app and appear in the notification bell — nothing is sent externally."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New alert
          </Button>
        }
      />

      {isPending ? (
        <AlertsSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load your alerts"
          description="Something went wrong while fetching alert rules."
          retry={() => refetch()}
        />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<BellRingIcon />}
          title="No alerts yet"
          description={`Set rules like “Notify me when NVDA falls below $120.00” or “when AAPL's RSI(14) drops under 30” — you'll see a notification the next time the condition is met.`}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon /> Create your first alert
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Symbol</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Last triggered</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id} className={!a.enabled ? "opacity-60" : undefined}>
                    <TableCell>
                      {a.symbol ? (
                        <Link
                          href={`/research/${a.symbol}`}
                          className="font-mono text-xs font-semibold text-ink transition-colors hover:text-brand"
                        >
                          {a.symbol}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {conditionSentence(a.kind, a.threshold)}
                    </TableCell>
                    <TableCell className="text-right tnum text-sm">{readingText(a)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={a.enabled}
                        aria-label={`${a.enabled ? "Disable" : "Enable"} alert for ${a.symbol ?? "rule"}`}
                        onCheckedChange={(enabled) => toggle.mutate({ id: a.id, enabled })}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-ink-muted">
                      {a.lastTriggeredAt ? relativeTime(a.lastTriggeredAt) : "never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteAlertButton alert={a} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NewAlertDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
