import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Money is stored as integer cents. Share quantities are stored as integers
 * scaled by 1e4 (qtyE4), supporting fractional shares to 4 decimal places.
 * Binary floating point never touches a financial balance.
 * All timestamps are unix milliseconds (UTC).
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

// ── identity ────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    // sha256 hash of the opaque session token; raw token only lives in the cookie
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("dark"),
  density: text("density", { enum: ["comfortable", "compact"] })
    .notNull()
    .default("comfortable"),
  dashboardLayout: text("dashboard_layout", { mode: "json" }).$type<{
    order: string[];
    hidden: string[];
  } | null>(),
  scorecardWeights: text("scorecard_weights", { mode: "json" }).$type<Record<
    string,
    number
  > | null>(),
  updatedAt: integer("updated_at").notNull().default(0),
});

// ── portfolio & trading ─────────────────────────────────────────────

export const portfolios = sqliteTable(
  "portfolios",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Paper Portfolio"),
    cashCents: integer("cash_cents").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("portfolios_user_name_uq").on(t.userId, t.name)],
);

export const cashLedger = sqliteTable(
  "cash_ledger",
  {
    id: id(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    deltaCents: integer("delta_cents").notNull(),
    balanceAfterCents: integer("balance_after_cents").notNull(),
    reason: text("reason", {
      enum: ["deposit", "withdrawal", "trade_buy", "trade_sell", "adjustment"],
    }).notNull(),
    refId: text("ref_id"),
    createdAt: createdAt(),
  },
  (t) => [index("cash_ledger_portfolio_idx").on(t.portfolioId)],
);

export const positions = sqliteTable(
  "positions",
  {
    id: id(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    qtyE4: integer("qty_e4").notNull(),
    avgCostCents: integer("avg_cost_cents").notNull(), // per whole share
    realizedPnlCents: integer("realized_pnl_cents").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (t) => [uniqueIndex("positions_portfolio_symbol_uq").on(t.portfolioId, t.symbol)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    side: text("side", { enum: ["buy", "sell"] }).notNull(),
    type: text("type", { enum: ["market", "limit", "stop", "stop_limit"] }).notNull(),
    qtyE4: integer("qty_e4").notNull(),
    limitPriceCents: integer("limit_price_cents"),
    stopPriceCents: integer("stop_price_cents"),
    status: text("status", {
      enum: ["open", "filled", "cancelled", "rejected", "expired"],
    }).notNull(),
    statusReason: text("status_reason"),
    idempotencyKey: text("idempotency_key"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (t) => [
    index("orders_portfolio_idx").on(t.portfolioId),
    index("orders_status_idx").on(t.status),
    uniqueIndex("orders_idempotency_uq").on(t.portfolioId, t.idempotencyKey),
  ],
);

export const trades = sqliteTable(
  "trades",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    side: text("side", { enum: ["buy", "sell"] }).notNull(),
    qtyE4: integer("qty_e4").notNull(),
    priceCents: integer("price_cents").notNull(), // execution price incl. slippage
    quotePriceCents: integer("quote_price_cents").notNull(), // reference quote at execution
    realizedPnlCents: integer("realized_pnl_cents"), // sells only
    executedAt: integer("executed_at").notNull(),
  },
  (t) => [
    index("trades_portfolio_idx").on(t.portfolioId),
    index("trades_symbol_idx").on(t.portfolioId, t.symbol),
  ],
);

export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshots",
  {
    id: id(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD (UTC)
    totalValueCents: integer("total_value_cents").notNull(),
    cashCents: integer("cash_cents").notNull(),
  },
  (t) => [uniqueIndex("snapshots_portfolio_date_uq").on(t.portfolioId, t.date)],
);

// ── watchlists & alerts ─────────────────────────────────────────────

export const watchlists = sqliteTable(
  "watchlists",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("watchlists_user_name_uq").on(t.userId, t.name)],
);

export const watchlistItems = sqliteTable(
  "watchlist_items",
  {
    id: id(),
    watchlistId: text("watchlist_id")
      .notNull()
      .references(() => watchlists.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    note: text("note"),
    tags: text("tags", { mode: "json" }).$type<string[] | null>(),
    targetEntryCents: integer("target_entry_cents"),
    targetExitCents: integer("target_exit_cents"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("watchlist_items_uq").on(t.watchlistId, t.symbol)],
);

export const alerts = sqliteTable(
  "alerts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    symbol: text("symbol"),
    kind: text("kind", {
      enum: [
        "price_above",
        "price_below",
        "pct_move",
        "volume_spike",
        "rsi_above",
        "rsi_below",
        "ma_cross",
        "drawdown",
      ],
    }).notNull(),
    // threshold semantics depend on kind: cents for price_*, bps for pct_move/drawdown,
    // 0-100 for rsi_*, multiplier x100 for volume_spike, window days for ma_cross
    threshold: integer("threshold"),
    params: text("params", { mode: "json" }).$type<Record<string, unknown> | null>(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    lastTriggeredAt: integer("last_triggered_at"),
    createdAt: createdAt(),
  },
  (t) => [index("alerts_user_idx").on(t.userId)],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: integer("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt)],
);

// ── market data cache ───────────────────────────────────────────────

export const candles = sqliteTable(
  "candles",
  {
    symbol: text("symbol").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    openCents: integer("open_cents").notNull(),
    highCents: integer("high_cents").notNull(),
    lowCents: integer("low_cents").notNull(),
    closeCents: integer("close_cents").notNull(),
    volume: integer("volume").notNull(),
    source: text("source", { enum: ["stooq", "synthetic"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.date] })],
);

export const candleMeta = sqliteTable("candle_meta", {
  symbol: text("symbol").primaryKey(),
  source: text("source", { enum: ["stooq", "synthetic"] }).notNull(),
  firstDate: text("first_date").notNull(),
  lastDate: text("last_date").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
});
