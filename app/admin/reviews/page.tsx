import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminReviewsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, shops(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Reviews</h1>
      <div className="grid gap-3">
        {reviews?.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{review.customer_name ?? "Customer"}</span>
                <span className="flex items-center text-sm text-primary"><Star className="mr-1 h-4 w-4 fill-current" />{review.rating}</span>
                <span className="text-sm text-muted-foreground">{formatDate(review.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
