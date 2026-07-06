"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CrosshairIcon, ListPlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { del, patch, ApiClientError } from "@/lib/client";
import { fmtCents, fmtPct } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/misc";
import { EmptyState, PctDelta, SourceBadge } from "@/components/format";
import type { WatchlistItem } from "./types";

function mutationMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/** Click-to-edit note; saves on Enter or blur, Escape cancels. */
function NoteCell({ listId, item }: { listId: string; item: WatchlistItem }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(item.note ?? "");

  const save = useMutation({
    mutationFn: (note: string) =>
      patch(`/api/watchlists/${listId}/items`, { itemId: item.id, note: note || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlists"] }),
    onError: (err) => toast.error(mutationMessage(err, "Could not save note")),
  });

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next !== (item.note ?? "")) save.mutate(next);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        maxLength={500}
        className="h-7 text-xs"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(item.note ?? "");
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(item.note ?? "");
        setEditing(true);
      }}
      className={cn(
        "max-w-48 truncate rounded-sm px-1 py-0.5 text-left text-xs transition-colors hover:bg-panel-2",
        item.note ? "text-ink-muted" : "text-ink-faint italic",
      )}
      title="Click to edit note"
    >
      {save.isPending ? "Saving…" : (item.note ?? "Add note…")}
    </button>
  );
}

/** Row-edit dialog for entry/exit price targets. */
function TargetDialog({
  listId,
  item,
  open,
  onOpenChange,
}: {
  listId: string;
  item: WatchlistItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [entry, setEntry] = React.useState("");
  const [exit, setExit] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setEntry(item.targetEntryCents !== null ? String(item.targetEntryCents / 100) : "");
      setExit(item.targetExitCents !== null ? String(item.targetExitCents / 100) : "");
      setError(null);
    }
  }, [open, item.targetEntryCents, item.targetExitCents]);

  const save = useMutation({
    mutationFn: (body: { targetEntryCents: number | null; targetExitCents: number | null }) =>
      patch(`/api/watchlists/${listId}/items`, { itemId: item.id, ...body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      onOpenChange(false);
    },
    onError: (err) => setError(mutationMessage(err, "Could not save targets")),
  });

  function parse(s: string): number | null | false {
    if (!s.trim()) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return false;
    return Math.round(n * 100);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const entryCents = parse(entry);
    const exitCents = parse(exit);
    if (entryCents === false || exitCents === false) {
      setError("Targets must be positive dollar amounts");
      return;
    }
    save.mutate({ targetEntryCents: entryCents, targetExitCents: exitCents });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Price targets · <span className="font-mono">{item.symbol}</span>
          </DialogTitle>
          <DialogDescription>
            You&apos;ll see a badge on the row when the price reaches a target. Leave a field empty
            to clear it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`entry-${item.id}`}>Target entry</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                  $
                </span>
                <Input
                  id={`entry-${item.id}`}
                  inputMode="decimal"
                  className="pl-7 tnum"
                  placeholder="e.g. 120.00"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`exit-${item.id}`}>Target exit</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                  $
                </span>
                <Input
                  id={`exit-${item.id}`}
                  inputMode="decimal"
                  className="pl-7 tnum"
                  placeholder="e.g. 180.00"
                  value={exit}
                  onChange={(e) => setExit(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
            </div>
          </div>
          {error && <p className="rounded-md bg-neg-soft px-3 py-2 text-xs text-neg">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save targets"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemRow({ listId, item }: { listId: string; item: WatchlistItem }) {
  const queryClient = useQueryClient();
  const [targetsOpen, setTargetsOpen] = React.useState(false);

  const remove = useMutation({
    mutationFn: () => del(`/api/watchlists/${listId}/items?itemId=${item.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlists"] }),
    onError: (err) => toast.error(mutationMessage(err, "Could not remove symbol")),
  });

  const q = item.quote;
  const atEntry = q && item.targetEntryCents !== null && q.priceCents <= item.targetEntryCents;
  const atExit = q && item.targetExitCents !== null && q.priceCents >= item.targetExitCents;

  return (
    <TableRow className={remove.isPending ? "opacity-50" : undefined}>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/research/${item.symbol}`}
            className="font-mono text-xs font-semibold text-ink transition-colors hover:text-brand"
          >
            {item.symbol}
          </Link>
          {atEntry && <Badge variant="pos">At entry target</Badge>}
          {atExit && <Badge variant="warn">At exit target</Badge>}
        </div>
      </TableCell>
      <TableCell className="max-w-44 truncate text-xs text-ink-muted">{item.name ?? "—"}</TableCell>
      <TableCell className="text-right">
        {q ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="tnum">{fmtCents(q.priceCents, { precise: true })}</span>
            <PctDelta value={q.changePct} className="text-xs" />
            <SourceBadge synthetic={q.synthetic} stale={q.stale} source={q.source} asOf={q.asOf} />
          </span>
        ) : (
          <Badge variant="warn">no data</Badge>
        )}
      </TableCell>
      <TableCell>
        <NoteCell listId={listId} item={item} />
      </TableCell>
      <TableCell className="text-right">
        <button
          type="button"
          onClick={() => setTargetsOpen(true)}
          className="rounded-sm px-1 py-0.5 text-xs tnum text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink"
          title="Edit price targets"
        >
          {item.targetEntryCents !== null || item.targetExitCents !== null ? (
            <>
              {item.targetEntryCents !== null ? fmtCents(item.targetEntryCents) : "—"}
              <span className="mx-1 text-ink-faint">/</span>
              {item.targetExitCents !== null ? fmtCents(item.targetExitCents) : "—"}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-ink-faint">
              <CrosshairIcon className="size-3.5" /> Set targets
            </span>
          )}
        </button>
        <TargetDialog
          listId={listId}
          item={item}
          open={targetsOpen}
          onOpenChange={setTargetsOpen}
        />
      </TableCell>
      <TableCell className="w-10 text-right">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Remove ${item.symbol}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <XIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove from list</TooltipContent>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

export function ItemsTable({ listId, items }: { listId: string; items: WatchlistItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ListPlusIcon />}
        title="This list is empty"
        description="Search for a symbol above to start tracking it — prices, notes, and entry/exit targets."
      />
    );
  }

  const withQuotes = items.filter((i) => i.quote);
  const avgMove =
    withQuotes.length > 0
      ? withQuotes.reduce((a, i) => a + (i.quote?.changePct ?? 0), 0) / withQuotes.length
      : null;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Symbol</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Price / day</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-right">Entry / exit</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <ItemRow key={item.id} listId={listId} item={item} />
          ))}
        </TableBody>
      </Table>
      <p className="mt-2 text-xs text-ink-muted">
        {items.length} {items.length === 1 ? "symbol" : "symbols"}
        {avgMove !== null && (
          <>
            {" · avg day move "}
            <span className={cn("tnum", avgMove > 0 ? "text-pos" : avgMove < 0 ? "text-neg" : "")}>
              {fmtPct(avgMove, { signed: true })}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
