import { Save } from "lucide-react";
import { upsertShop } from "@/lib/actions/vendor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/supabase/auth";
import { getVendorShop } from "@/lib/data/vendor";

export default async function VendorShopPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const profile = await requireRole(["vendor", "admin"]);
  const shop = await getVendorShop(profile.id);
  const params = await searchParams;

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Shop profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>{shop ? "Update shop" : "Create shop"}</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error ? <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{params.error}</p> : null}
          {params.saved ? <p className="mb-4 rounded-md bg-primary/10 p-3 text-sm text-primary">Shop saved.</p> : null}
          <form action={upsertShop} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="existing_image_url" value={shop?.image_url ?? ""} />
            <Field label="Shop name" name="name" defaultValue={shop?.name} required />
            <Field label="Slug" name="slug" defaultValue={shop?.slug} required />
            <Field label="Phone" name="phone" defaultValue={shop?.phone} />
            <Field label="Location" name="location" defaultValue={shop?.location} />
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" defaultValue={shop?.address ?? ""} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={shop?.description ?? ""} />
            </div>
            <Field label="Opening hours" name="opening_hours" defaultValue={shop?.opening_hours} />
            <div className="grid gap-2">
              <Label htmlFor="image">Shop image/logo</Label>
              <Input id="image" name="image" type="file" accept="image/*" />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="is_open" defaultChecked={shop?.is_open ?? true} />
              Open for orders
            </label>
            <Button type="submit" className="w-fit"><Save className="h-4 w-4" />Save shop</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} required={required} />
    </div>
  );
}
