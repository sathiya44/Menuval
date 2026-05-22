import { updateShopModeration } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVendorsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data: shops } = await supabase
    .from("shops")
    .select("*, profiles(email, full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Vendors</h1>
      <div className="grid gap-4">
        {shops?.map((shop) => (
          <Card key={shop.id}>
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{shop.name}</h2>
                  <Badge variant={shop.is_approved ? "default" : "outline"}>{shop.is_approved ? "Approved" : "Pending"}</Badge>
                  {shop.is_restricted ? <Badge variant="destructive">Restricted</Badge> : null}
                  {shop.is_featured ? <Badge variant="secondary">Featured</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{shop.address}</p>
              </div>
              <form action={updateShopModeration} className="flex flex-wrap items-center gap-3 text-sm">
                <input type="hidden" name="shopId" value={shop.id} />
                <label className="flex items-center gap-2"><input type="checkbox" name="is_approved" defaultChecked={shop.is_approved} />Approve</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="is_restricted" defaultChecked={shop.is_restricted} />Restrict</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={shop.is_featured} />Feature</label>
                <Button size="sm" type="submit">Save</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
