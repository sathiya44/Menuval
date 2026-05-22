import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { currency, formatDateTime } from "@/lib/utils";

export default async function AdminOrdersPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, shops(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="grid gap-3">
        {orders?.map((order) => (
          <Card key={order.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">Token {order.token}</p>
                <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
              </div>
              <Badge>{order.status}</Badge>
              <p className="font-semibold">{currency(Number(order.total_amount))}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
