import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { isDemoMode } from "@/lib/market-data";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" description="Account, appearance and data sources" />
      <SettingsClient
        email={user.email}
        username={user.username}
        demoMode={isDemoMode()}
        finnhubConfigured={Boolean(env.FINNHUB_API_KEY)}
        stooqEnabled={env.STOOQ_ENABLED}
      />
    </div>
  );
}
