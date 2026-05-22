import Image from "next/image";
import { Trash2 } from "lucide-react";
import { deleteDish, upsertDish } from "@/lib/actions/vendor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currency } from "@/lib/utils";
import { requireRole } from "@/lib/supabase/auth";
import { getShopMenu, getVendorShop } from "@/lib/data/vendor";

export default async function VendorMenuPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const profile = await requireRole(["vendor", "admin"]);
  const shop = await getVendorShop(profile.id);
  const params = await searchParams;

  if (!shop) return <EmptyState title="No shop yet" description="Create your shop before adding dishes." />;
  const { categories, dishes } = await getShopMenu(shop.id);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Menu management</h1>
        <p className="text-sm text-muted-foreground">Free plan limit: 10 dishes. Premium unlocks unlimited dishes and offers.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Add dish</CardTitle></CardHeader>
        <CardContent>
          {params.error ? <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</p> : null}
          {params.saved ? <p className="mb-4 rounded-md bg-primary/10 p-3 text-sm text-primary">Dish saved.</p> : null}
          <form action={upsertDish} className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Dish name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" min="0" step="0.01" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer_price">Offer price</Label>
              <Input id="offer_price" name="offer_price" type="number" min="0" step="0.01" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category_id">Existing category</Label>
              <select id="category_id" name="category_id" className="h-10 rounded-md border bg-white px-3 text-sm">
                <option value="">None</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category_name">New category</Label>
              <Input id="category_name" name="category_name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Dish image</Label>
              <Input id="image" name="image" type="file" accept="image/*" />
            </div>
            <div className="grid gap-2 md:col-span-3">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_available" defaultChecked /> Available</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_offer" /> Daily offer/combo</label>
            <Button type="submit" className="w-fit">Add dish</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {dishes.length === 0 ? <EmptyState title="No dishes" description="Add your first dish to publish it on the QR menu." /> : null}
        {dishes.map((dish) => (
          <Card key={dish.id}>
            <CardContent className="grid gap-4 p-4 md:grid-cols-[96px_1fr_auto]">
              <div className="relative h-24 w-24 overflow-hidden rounded-md bg-muted">
                {dish.image_url ? <Image src={dish.image_url} alt={dish.name} fill className="object-cover" /> : null}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{dish.name}</h2>
                  <Badge variant={dish.is_available ? "default" : "outline"}>{dish.is_available ? "Available" : "Out of stock"}</Badge>
                  {dish.is_offer ? <Badge variant="secondary">Offer</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{dish.description}</p>
                <p className="mt-2 font-medium">{currency(Number(dish.offer_price ?? dish.price))}</p>
                <form action={upsertDish} className="mt-4 grid gap-2 md:grid-cols-4">
                  <input type="hidden" name="id" value={dish.id} />
                  <input type="hidden" name="category_id" value={dish.category_id ?? ""} />
                  <input type="hidden" name="existing_image_url" value={dish.image_url ?? ""} />
                  <Input name="name" defaultValue={dish.name} aria-label="Dish name" />
                  <Input name="price" type="number" min="0" step="0.01" defaultValue={dish.price} aria-label="Price" />
                  <Input name="offer_price" type="number" min="0" step="0.01" defaultValue={dish.offer_price ?? ""} aria-label="Offer price" />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_available" defaultChecked={dish.is_available} />Available</label>
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_offer" defaultChecked={dish.is_offer} />Offer</label>
                  </div>
                  <Textarea name="description" defaultValue={dish.description ?? ""} className="md:col-span-3" aria-label="Description" />
                  <Button size="sm" type="submit" className="w-fit">Update</Button>
                </form>
              </div>
              <form action={deleteDish}>
                <input type="hidden" name="id" value={dish.id} />
                <Button variant="outline" size="icon" type="submit" aria-label="Delete dish"><Trash2 className="h-4 w-4" /></Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
