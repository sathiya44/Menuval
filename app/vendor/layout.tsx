import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/supabase/auth";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["vendor", "admin"]);
  return <DashboardShell profile={profile} mode="vendor">{children}</DashboardShell>;
}
