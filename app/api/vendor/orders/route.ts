import { NextResponse } from "next/server";
import { getVendorOrders, getVendorShop } from "@/lib/data/vendor";
import { requireRole } from "@/lib/supabase/auth";

export async function GET(request: Request) {
  const profile = await requireRole(["vendor", "admin"]);
  const shop = await getVendorShop(profile.id);
  const requestedShopId = new URL(request.url).searchParams.get("shopId");

  if (!shop) {
    return NextResponse.json({ error: "Shop was not found." }, { status: 404 });
  }

  if (requestedShopId && requestedShopId !== shop.id && profile.role !== "admin") {
    return NextResponse.json({ error: "You cannot view this shop queue." }, { status: 403 });
  }

  const orders = await getVendorOrders(requestedShopId ?? shop.id);
  return NextResponse.json({ orders });
}
