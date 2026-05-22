import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

  const { data: order, error } = await (supabase as any).rpc("get_public_order_by_token", {
    p_token: token.toUpperCase()
  });

  const trackedOrder = Array.isArray(order) ? order[0] : order;

  if (error || !trackedOrder) {
    if (error) console.error("Order lookup RPC failed, trying server fallback", error);
    const admin = createAdminClient();
    const { data: fallbackOrder, error: fallbackError } = await admin
      .from("orders")
      .select("token, status, total_amount, accepted_at, preparing_at, ready_at, completed_at, created_at, shops(name, slug)")
      .eq("token", token.toUpperCase())
      .single();

    if (fallbackError || !fallbackOrder) {
      return NextResponse.json({ error: "Order was not found." }, { status: 404 });
    }

    return NextResponse.json({ order: fallbackOrder });
  }

  return NextResponse.json({ order: trackedOrder });
}
