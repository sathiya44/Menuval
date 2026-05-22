import { EmptyState } from "@/components/ui/empty-state";
import { OrderQueue } from "@/components/vendor/order-queue";
import { requireRole } from "@/lib/supabase/auth";
import { getVendorOrders, getVendorShop } from "@/lib/data/vendor";

export default async function VendorOrdersPage() {
  const profile = await requireRole(["vendor", "admin"]);
  const shop = await getVendorShop(profile.id);

  if (!shop) return <EmptyState title="No shop yet" description="Create your shop to receive orders." />;

  const orders = await getVendorOrders(shop.id);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Realtime order queue</h1>
        <p className="text-sm text-muted-foreground">Orders are sorted by creation time.</p>
      </div>
  <OrderQueue shopId={shop.id} initialOrders={orders} />
    </div>
  );
}
