import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UpgradeButton } from "@/components/vendor/upgrade-button";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getVendorShop } from "@/lib/data/vendor";
import { currency, formatDate } from "@/lib/utils";

export default async function VendorSubscriptionPage() {
  const profile = await requireRole(["vendor", "admin"]);
  const shop = await getVendorShop(profile.id);
  if (!shop) return <EmptyState title="No shop yet" description="Create your shop before activating a plan." />;

  const supabase = await createClient();
  const [{ data: subscriptions }, { data: payments }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("vendor_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("payments").select("*").eq("vendor_id", profile.id).order("created_at", { ascending: false })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscription</h1>
        <p className="text-sm text-muted-foreground">Razorpay checkout is wired through the API route for premium upgrades.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-primary" />Active plan</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge>{shop.active_plan}</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              Expiry: {shop.plan_expires_at ? formatDate(shop.plan_expires_at) : "No expiry on free plan"}
            </p>
          </div>
          <UpgradeButton vendorName={profile.full_name ?? shop.name} vendorEmail={profile.email} />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Plan history</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {subscriptions?.length ? subscriptions.map((sub) => (
              <div key={sub.id} className="rounded-md border p-3 text-sm">
                <div className="flex justify-between"><span>{sub.plan}</span><Badge variant="outline">{sub.status}</Badge></div>
                <p className="mt-1 text-muted-foreground">{formatDate(sub.starts_at)} - {sub.expires_at ? formatDate(sub.expires_at) : "ongoing"}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No subscription records yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {payments?.length ? payments.map((payment) => (
              <div key={payment.id} className="rounded-md border p-3 text-sm">
                <div className="flex justify-between"><span>{currency(Number(payment.amount))}</span><Badge variant="outline">{payment.status}</Badge></div>
                <p className="mt-1 text-muted-foreground">{formatDate(payment.created_at)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No payments yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
