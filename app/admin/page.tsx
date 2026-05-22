import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const [shops, orders, reviews, subscriptions] = await Promise.all([
    supabase.from("shops").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active")
  ]);

  const stats = [
    ["Vendors", shops.count ?? 0],
    ["Orders", orders.count ?? 0],
    ["Reviews", reviews.count ?? 0],
    ["Active subscriptions", subscriptions.count ?? 0]
  ];

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Platform analytics</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
