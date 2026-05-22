import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getVendorShop } from "@/lib/data/vendor";
import { formatDate } from "@/lib/utils";

export default async function VendorReviewsPage() {
  const profile = await requireRole(["vendor", "admin"]);
  const shop = await getVendorShop(profile.id);
  if (!shop) return <EmptyState title="No shop yet" description="Reviews appear after customers rate your shop." />;

  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, dishes(name)")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Reviews</h1>
      {reviews?.length ? reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{review.customer_name ?? "Customer"}</span>
              <span className="flex items-center text-sm text-primary"><Star className="mr-1 h-4 w-4 fill-current" />{review.rating}</span>
              <span className="text-sm text-muted-foreground">{formatDate(review.created_at)}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{review.comment ?? "No comment"}</p>
          </CardContent>
        </Card>
      )) : <EmptyState title="No reviews" description="Customer dish ratings and shop feedback will show here." />}
    </div>
  );
}
