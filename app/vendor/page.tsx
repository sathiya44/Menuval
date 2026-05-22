import Link from "next/link";
import { QrCode, ReceiptText, Star, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QrGenerator } from "@/components/vendor/qr-generator";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getVendorShop } from "@/lib/data/vendor";

export default async function VendorDashboardPage() {
  const profile = await requireRole(["vendor", "admin"]);
  const supabase = await createClient();
  const shop = await getVendorShop(profile.id);

  if (!shop) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Vendor dashboard</h1>
        <EmptyState title="Create your shop profile" description="Add shop details before publishing your QR menu." />
        <Button asChild className="w-fit"><Link href="/vendor/shop">Create shop</Link></Button>
      </div>
    );
  }

  const [{ count: dishCount }, { count: orderCount }, { count: reviewCount }] = await Promise.all([
    supabase.from("dishes").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("shop_id", shop.id)
  ]);

  const stats = [
    ["Dishes", dishCount ?? 0, Utensils],
    ["Orders", orderCount ?? 0, ReceiptText],
    ["Reviews", reviewCount ?? 0, Star],
    ["QR menu", `/menu/${shop.slug}`, QrCode]
  ];
  const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/menu/${shop.slug}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">{shop.address ?? "Address not added"}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={shop.is_open ? "default" : "outline"}>{shop.is_open ? "Open" : "Closed"}</Badge>
          <Badge variant={shop.is_approved ? "secondary" : "outline"}>{shop.is_approved ? "Approved" : "Pending approval"}</Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <Card key={String(label)}>
            <CardHeader>
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Public QR URL</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-md bg-muted px-3 py-2 text-sm">{menuUrl}</code>
            <Button asChild variant="outline"><Link href={`/menu/${shop.slug}`}>Preview</Link></Button>
          </div>
          <QrGenerator menuUrl={menuUrl} shopName={shop.name} />
        </CardContent>
      </Card>
    </div>
  );
}
