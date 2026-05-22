import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Subscription } from "@/lib/database.types";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type AdminSubscription = Subscription & {
  profiles?: { email: string } | null;
  shops?: { name: string } | null;
};

export default async function AdminSubscriptionsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*, profiles(email), shops(name)")
    .order("created_at", { ascending: false });
  const typedSubscriptions = (subscriptions ?? []) as unknown as AdminSubscription[];

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Subscriptions</h1>
      <div className="grid gap-3">
        {typedSubscriptions.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{sub.plan}</p>
                <p className="text-sm text-muted-foreground">{sub.expires_at ? formatDate(sub.expires_at) : "No expiry"}</p>
              </div>
              <Badge>{sub.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
