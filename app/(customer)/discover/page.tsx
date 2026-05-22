import Link from "next/link";
import { Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { getApprovedShops } from "@/lib/data/public";
import { currency } from "@/lib/utils";

export default async function DiscoverPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const shops = await getApprovedShops(params.q);
  const searchTerm = normalizeSearchText(params.q ?? "");
  const searchTerms = searchTerm.split(" ").filter(Boolean);

  return (
    <main className="container grid gap-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Discover local food</h1>
        <p className="text-sm text-muted-foreground">Search by shop or dish and compare prices across vendors.</p>
      </div>
      <form className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" name="q" defaultValue={params.q ?? ""} placeholder="Search biryani, dosa, cafe..." />
        </div>
        <Button type="submit">Search</Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shops.length === 0 ? <EmptyState title="No shops found" description="Try another dish or shop name." /> : null}
        {shops.map((shop) => {
          const dishes = shop.dishes ?? [];
          const matchingDishes = searchTerm
            ? dishes.filter((dish) => {
                const dishName = normalizeSearchText(dish.name);
                return searchTerms.every((term) => dishName.includes(term));
              })
            : [];
          const displayDishes = matchingDishes.length
            ? matchingDishes
            : [...dishes]
                .sort((a, b) => Number(a.offer_price ?? a.price) - Number(b.offer_price ?? b.price))
                .slice(0, 3);
          return (
            <Card key={shop.id}>
              <CardContent className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{shop.name}</h2>
                    <p className="text-sm text-muted-foreground">{shop.location ?? shop.address}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge variant={shop.is_open ? "default" : "outline"}>{shop.is_open ? "Open" : "Closed"}</Badge>
                    {!shop.is_approved ? <Badge variant="outline">New</Badge> : null}
                  </div>
                </div>
                <div className="grid gap-2">
                  {displayDishes.map((dish) => (
                    <div key={dish.id} className="rounded-md bg-muted p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{dish.name}</span>
                        <span className="font-semibold">{currency(Number(dish.offer_price ?? dish.price))}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center"><Star className="mr-1 h-3 w-3 fill-current" />{Number(dish.rating).toFixed(1)} rating</span>
                        <span>{dish.is_available ? "Available" : "Out of stock"}</span>
                        {dish.offer_price ? <Badge variant="secondary">Offer</Badge> : null}
                      </div>
                    </div>
                  ))}
                  {displayDishes.length === 0 ? (
                    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                      No dishes added yet.
                    </p>
                  ) : null}
                </div>
                <Button asChild variant="outline"><Link href={`/menu/${shop.slug}`}>Open menu</Link></Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[+_-]+/g, " ").replace(/\s+/g, " ");
}
