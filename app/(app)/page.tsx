import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <DashboardClient username={user.username} />;
}
