import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MenuCart } from "@/components/customer/menu-cart";
import { RatingForm } from "@/components/customer/rating-form";
import { getPublicMenu } from "@/lib/data/public";

export default async function PublicMenuPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { slug } = await params;
  const { order } = await searchParams;
  const data = await getPublicMenu(slug);
  if (!data) notFound();
  const { shop, categories, dishes } = data;

  return (
    <main className="container max-w-6xl py-3 sm:py-5">
      <section className="mb-5 overflow-hidden rounded-lg border bg-card">
        <div className="relative h-36 bg-muted sm:h-64">
          {shop.image_url ? <Image src={shop.image_url} alt={shop.name} fill className="object-cover" priority /> : null}
        </div>
        <div className="grid gap-3 p-4">
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold sm:text-2xl">{shop.name}</h1>
            <div className="flex flex-wrap gap-2">
              {!shop.is_approved ? <Badge variant="outline">Preview</Badge> : null}
              <Badge variant={shop.is_open ? "default" : "outline"}>{shop.is_open ? "Open" : "Closed"}</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{shop.description}</p>
          <div className="grid gap-2 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:gap-4">
            {shop.phone ? <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{shop.phone}</span> : null}
            {shop.address ? <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{shop.address}</span> : null}
          </div>
        </div>
      </section>
      <MenuCart shop={shop} categories={categories} dishes={dishes} orderToken={order} />
      <RatingForm shopId={shop.id} dishes={dishes} />
    </main>
  );
}
