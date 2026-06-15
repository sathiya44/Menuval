import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const rateLimit = await checkRateLimit("orders:lookup", 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many order lookup attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
    );
  }

  const { token } = await params;
  const normalizedToken = decodeURIComponent(token).trim().toUpperCase();

  if (!normalizedToken) {
    return NextResponse.json({ error: "Order token is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("token, status, total_amount, accepted_at, preparing_at, ready_at, completed_at, created_at, shop_id")
    .eq("token", normalizedToken)
    .maybeSingle();

  if (error) {
    console.error("Order lookup failed", error);
    return NextResponse.json({ error: "Could not load this order." }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order was not found." }, { status: 404 });
  }

  const { data: shop, error: shopError } = await admin
    .from("shops")
    .select("name, slug")
    .eq("id", order.shop_id)
    .maybeSingle();

  if (shopError) {
    console.error("Order shop lookup failed", shopError);
  }

  return NextResponse.json({
    order: {
      ...order,
      shops: shop ?? null
    }
  });
}
