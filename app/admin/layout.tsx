import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/supabase/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["admin"]);
  return <DashboardShell profile={profile} mode="admin">{children}</DashboardShell>;
}
