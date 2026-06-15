"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";
import { dishSchema, orderStatusSchema, shopSchema } from "@/lib/validators/shop";
import { safeUploadName, validateImageUpload } from "@/lib/security/uploads";

function nullable(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length ? text : null;
}

export async function upsertShop(formData: FormData) {
  const profile = await requireRole(["vendor", "admin"]);
  const values = shopSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: nullable(formData.get("description")),
    phone: nullable(formData.get("phone")),
    address: nullable(formData.get("address")),
    location: nullable(formData.get("location")),
    opening_hours: nullable(formData.get("opening_hours")),
    is_open: formData.get("is_open") === "on"
  });
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("shops")
    .select("id")
    .eq("vendor_id", profile.id)
    .maybeSingle();

  let imageUrl = nullable(formData.get("existing_image_url"));
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const uploadError = validateImageUpload(file);
    if (uploadError) redirect(`/vendor/shop?error=${encodeURIComponent(uploadError)}`);

    const path = `${profile.id}/shop-${Date.now()}-${safeUploadName(file.name)}`;
    const { error } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
    if (!error) {
      imageUrl = supabase.storage.from("shop-assets").getPublicUrl(path).data.publicUrl;
    }
  }

  const payload = {
    ...values,
    image_url: imageUrl,
    vendor_id: profile.id
  };

  const result = existing
    ? await supabase.from("shops").update(payload).eq("id", existing.id).select("id, slug").single()
    : await supabase.from("shops").insert(payload).select("id, slug").single();

  if (result.error) redirect(`/vendor/shop?error=${encodeURIComponent(result.error.message)}`);

  await supabase
    .from("shop_public_links")
    .upsert({ shop_id: result.data.id, slug: result.data.slug }, { onConflict: "shop_id" });

  revalidatePath("/vendor");
  revalidatePath("/discover");
  redirect("/vendor/shop?saved=1");
}

export async function upsertDish(formData: FormData) {
  const profile = await requireRole(["vendor", "admin"]);
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, active_plan")
    .eq("vendor_id", profile.id)
    .single();

  if (!shop) redirect("/vendor/shop");

  const values = dishSchema.parse({
    id: nullable(formData.get("id")),
    shop_id: shop.id,
    category_id: nullable(formData.get("category_id")),
    category_name: nullable(formData.get("category_name")),
    name: formData.get("name"),
    description: nullable(formData.get("description")),
    price: formData.get("price"),
    offer_price: nullable(formData.get("offer_price")),
    is_available: formData.get("is_available") === "on",
    is_offer: formData.get("is_offer") === "on"
  });

  if (!values.id && shop.active_plan === "free") {
    const { count } = await supabase
      .from("dishes")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id);
    if ((count ?? 0) >= 10) redirect("/vendor/menu?error=Free plan is limited to 10 dishes");
  }

  let categoryId = values.category_id ?? null;
  if (!categoryId && values.category_name) {
    const { data: category } = await supabase
      .from("categories")
      .insert({ shop_id: shop.id, name: values.category_name })
      .select("id")
      .single();
    categoryId = category?.id ?? null;
  }

  let imageUrl = nullable(formData.get("existing_image_url"));
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const uploadError = validateImageUpload(file);
    if (uploadError) redirect(`/vendor/menu?error=${encodeURIComponent(uploadError)}`);

    const path = `${profile.id}/dish-${Date.now()}-${safeUploadName(file.name)}`;
    const { error } = await supabase.storage.from("dish-assets").upload(path, file, { upsert: true });
    if (!error) imageUrl = supabase.storage.from("dish-assets").getPublicUrl(path).data.publicUrl;
  }

  const payload = {
    shop_id: shop.id,
    category_id: categoryId,
    name: values.name,
    description: values.description ?? null,
    image_url: imageUrl,
    price: values.price,
    offer_price: values.offer_price || null,
    is_available: values.is_available,
    is_offer: values.is_offer
  };

  const result = values.id
    ? await supabase.from("dishes").update(payload).eq("id", values.id)
    : await supabase.from("dishes").insert(payload);

  if (result.error) redirect(`/vendor/menu?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/vendor/menu");
  revalidatePath("/discover");
  redirect("/vendor/menu?saved=1");
}

export async function deleteDish(formData: FormData) {
  await requireRole(["vendor", "admin"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  await supabase.from("dishes").delete().eq("id", id);
  revalidatePath("/vendor/menu");
}

export async function updateOrderStatus(formData: FormData) {
  const profile = await requireRole(["vendor", "admin"]);
  const values = orderStatusSchema.parse({
    orderId: formData.get("orderId"),
    status: formData.get("status")
  });
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, shop_id")
    .eq("id", values.orderId)
    .single();

  if (!order) {
    return { ok: false, error: "Order was not found." };
  }

  if (profile.role !== "admin") {
    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("vendor_id", profile.id)
      .eq("id", order.shop_id)
      .maybeSingle();

    if (!shop) {
      return { ok: false, error: "You cannot update this order." };
    }
  }

  const timestampColumn = {
    pending: null,
    accepted: "accepted_at",
    preparing: "preparing_at",
    ready: "ready_at",
    completed: "completed_at"
  }[values.status];
  const updates: Record<string, string> = { status: values.status };

  if (timestampColumn) {
    updates[timestampColumn] = new Date().toISOString();
  }

  const { error } = await admin
    .from("orders")
    .update(updates)
    .eq("id", values.orderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/vendor/orders");
  return { ok: true, error: "" };
}
