import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem } from "@/lib/database.types";

export type OrderWithItems = Order & { order_items: OrderItem[] };

export async function getVendorShop(vendorId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  return data;
}

export async function getShopMenu(shopId: string) {
  const supabase = await createClient();
  const [{ data: categories }, { data: dishes }] = await Promise.all([
    supabase.from("categories").select("*").eq("shop_id", shopId).order("sort_order"),
    supabase.from("dishes").select("*").eq("shop_id", shopId).order("created_at", { ascending: false })
  ]);

  return { categories: categories ?? [], dishes: dishes ?? [] };
}

export async function getVendorOrders(shopId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*, order_items(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Vendor order lookup failed", error);
  }

  return (data ?? []) as unknown as OrderWithItems[];
}
