"use client";

import Image from "next/image";
import { Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { currency } from "@/lib/utils";
import type { Category, Dish, Shop } from "@/lib/database.types";

type CartLine = { dish: Dish; quantity: number };

export function MenuCart({
  shop,
  categories,
  dishes,
  orderToken
}: {
  shop: Shop;
  categories: Category[];
  dishes: Dish[];
  orderToken?: string;
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [category, setCategory] = useState<string>("all");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = category === "all" ? dishes : dishes.filter((dish) => dish.category_id === category);
  const lines = Object.values(cart);
  const total = lines.reduce((sum, line) => sum + Number(line.dish.offer_price ?? line.dish.price) * line.quantity, 0);

  function add(dish: Dish) {
    if (!dish.is_available) return;
    setCart((current) => ({
      ...current,
      [dish.id]: { dish, quantity: (current[dish.id]?.quantity ?? 0) + 1 }
    }));
  }

  function decrement(id: string) {
    setCart((current) => {
      const line = current[id];
      if (!line) return current;
      if (line.quantity === 1) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { ...line, quantity: line.quantity - 1 } };
    });
  }

  const categoriesWithAll = useMemo(() => [{ id: "all", name: "All" }, ...categories], [categories]);

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopId: shop.id,
            orderToken,
            customerName: formData.get("customerName"),
            customerPhone: formData.get("customerPhone"),
            note: formData.get("note"),
            items: lines.map((line) => ({
              dishId: line.dish.id,
              quantity: line.quantity
            }))
          })
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setError(payload?.error ?? "Could not submit order. Please try again.");
          return;
        }

        router.push(`/order/${payload.token}`);
      } catch {
        setError("Could not reach the order service. Please try again.");
      }
    });
  }

  return (
    <div className="grid gap-5 pb-24 lg:grid-cols-[1fr_360px] lg:pb-0">
      <section className="grid gap-4">
        <div className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto border-b bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          {categoriesWithAll.map((item) => (
            <Button
              key={item.id}
              variant={category === item.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </div>
        {filtered.map((dish) => {
          const quantity = cart[dish.id]?.quantity ?? 0;
          return (
          <Card key={dish.id}>
            <CardContent className="grid grid-cols-[76px_1fr] gap-3 p-3 sm:grid-cols-[88px_1fr_auto]">
              <div className="relative h-[76px] w-[76px] overflow-hidden rounded-md bg-muted sm:h-[88px] sm:w-[88px]">
                {dish.image_url ? <Image src={dish.image_url} alt={dish.name} fill className="object-cover" /> : null}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{dish.name}</h2>
                  {dish.is_offer ? <Badge variant="secondary">Offer</Badge> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{dish.description}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="font-semibold">{currency(Number(dish.offer_price ?? dish.price))}</span>
                  <span className="flex items-center text-xs text-muted-foreground"><Star className="mr-1 h-3 w-3 fill-current" />{Number(dish.rating).toFixed(1)}</span>
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-end sm:col-span-1 sm:min-w-24">
                {quantity > 0 ? (
                  <div className="grid h-11 w-full grid-cols-[44px_1fr_44px] items-center rounded-md border bg-background sm:w-auto sm:min-w-32">
                    <Button size="icon" variant="ghost" onClick={() => decrement(dish.id)} aria-label="Remove one">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                    <Button size="icon" variant="ghost" onClick={() => add(dish)} aria-label="Add one">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full sm:w-11" size="icon" variant={dish.is_available ? "default" : "outline"} disabled={!dish.is_available} onClick={() => add(dish)} aria-label="Add dish">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No dishes are available in this section yet.
            </CardContent>
          </Card>
        ) : null}
      </section>
      <aside className="order-first h-fit rounded-lg border bg-card p-4 shadow-sm lg:order-none lg:sticky lg:top-20">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="h-5 w-5" />
          {orderToken ? `Order ${orderToken}` : "Cart"}
        </div>
        <div className="mt-4 grid max-h-56 gap-3 overflow-auto pr-1 lg:max-h-72">
          {lines.length === 0 ? <p className="text-sm text-muted-foreground">Add dishes to create an order.</p> : null}
          {lines.map((line) => (
            <div key={line.dish.id} className="flex items-center justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{line.dish.name}</p>
                <p className="text-muted-foreground">{currency(Number(line.dish.offer_price ?? line.dish.price))}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => decrement(line.dish.id)} aria-label="Remove one"><Minus className="h-4 w-4" /></Button>
                <span className="w-5 text-center">{line.quantity}</span>
                <Button size="icon" variant="outline" onClick={() => add(line.dish)} aria-label="Add one"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submitOrder} className="mt-5 grid gap-3">
          {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <Input name="customerName" placeholder="Name" />
          <Input name="customerPhone" placeholder="Phone" />
          <Textarea name="note" placeholder="Order note" />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span>{currency(total)}</span>
          </div>
          <Button className="h-11 w-full" disabled={lines.length === 0 || isPending || !shop.is_open} type="submit">
            {shop.is_open ? (orderToken ? "Add items / new order" : "Submit order") : "Shop closed"}
          </Button>
        </form>
      </aside>
    </div>
  );
}
