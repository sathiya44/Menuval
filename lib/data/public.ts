import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Dish, Shop } from "@/lib/database.types";

export type PublicShop = Shop & {
  dishes: Pick<Dish, "id" | "name" | "price" | "offer_price" | "rating" | "is_available">[];
};

export async function getApprovedShops(query?: string) {
  const supabase = await createClient();
  const { data: shopsData } = await supabase
    .from("shops")
    .select("*")
    .eq("is_approved", true)
    .eq("is_restricted", false)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  const shops = (shopsData ?? []) as Shop[];
  if (shops.length === 0) return [];

  const { data: dishesData, error: dishesError } = await supabase
    .from("dishes")
    .select("id, shop_id, name, price, offer_price, rating, is_available")
    .in("shop_id", shops.map((shop) => shop.id));

  if (dishesError) {
    console.error("Public dish discovery failed", dishesError);
  }

  const fallbackDishes =
    dishesError || !dishesData?.length
      ? await getPublicDiscoveryDishes(shops.map((shop) => shop.id))
      : null;

  const dishes = ((fallbackDishes ?? dishesData) ?? []) as Pick<
    Dish,
    "id" | "shop_id" | "name" | "price" | "offer_price" | "rating" | "is_available"
  >[];

  const shopsWithDishes = shops.map((shop) => ({
    ...shop,
    dishes: dishes.filter((dish) => dish.shop_id === shop.id)
  })) as PublicShop[];

  if (!query) return shopsWithDishes;

  const normalized = normalizeSearchText(query);
  if (!normalized) return shopsWithDishes;

  const terms = normalized.split(" ").filter(Boolean);

  return shopsWithDishes.filter((shop) => {
    const searchableText = normalizeSearchText(
      [
        shop.name,
        shop.slug,
        shop.location,
        shop.address,
        ...(shop.dishes ?? []).map((dish) => dish.name)
      ]
        .filter(Boolean)
        .join(" ")
    );

    return terms.every((term) => searchableText.includes(term));
  });
}

export async function getPublicMenu(slug: string) {
  const requestClient = await createClient();
  const admin = createAdminClient();
  const normalizedSlug = slug.trim().toLowerCase();
  const {
    data: { user }
  } = await requestClient.auth.getUser();

  const { data: directShop } = await admin
    .from("shops")
    .select("*")
    .ilike("slug", normalizedSlug)
    .maybeSingle();

  let shop = directShop;

  if (!shop) {
    const { data: shops } = await admin
      .from("shops")
      .select("*")
      .eq("is_restricted", false);

    shop =
      shops?.find((item) => normalizeSearchText(item.slug) === normalizeSearchText(slug)) ??
      shops?.find((item) => normalizeSearchText(item.name) === normalizeSearchText(slug)) ??
      null;
  }

  if (!shop) return null;

  let isAdmin = false;
  if (user) {
    const { data: profile } = await requestClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  const canPreview = user && (shop.vendor_id === user.id || isAdmin);
  const isPublic = shop.is_approved && !shop.is_restricted;
  if (!isPublic && !canPreview) return null;

  const [{ data: categories, error: categoriesError }, { data: dishes, error: dishesError }] = await Promise.all([
    admin.from("categories").select("*").eq("shop_id", shop.id).order("sort_order"),
    admin
      .from("dishes")
      .select("*")
      .eq("shop_id", shop.id)
      .order("is_offer", { ascending: false })
      .order("name")
  ]);

  if (categoriesError) console.error("Public menu category lookup failed", categoriesError);
  if (dishesError) console.error("Public menu dish lookup failed", dishesError);

  return { shop, categories: categories ?? [], dishes: dishes ?? [] };
}

async function getPublicDiscoveryDishes(shopIds: string[]) {
  if (shopIds.length === 0) return null;

  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc("get_public_discovery_dishes", {
    p_shop_ids: shopIds
  });

  if (error) {
    console.error("Public discovery dish fallback failed", error);
    return null;
  }

  return data;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[+_-]+/g, " ").replace(/\s+/g, " ");
}
