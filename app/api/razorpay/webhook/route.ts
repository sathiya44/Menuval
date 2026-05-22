import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return NextResponse.json({ error: "Webhook secret or signature missing." }, { status: 400 });
  }

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createAdminClient();

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const vendorId = payment.notes?.vendor_id;
    if (vendorId) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("vendor_id", vendorId)
        .maybeSingle();

      const { data: subscription } = await supabase
        .from("subscriptions")
        .insert({
          vendor_id: vendorId,
          shop_id: shop?.id ?? null,
          plan: "premium",
          status: "active",
          expires_at: expiresAt.toISOString()
        })
        .select("id")
        .single();

      await supabase
        .from("payments")
        .update({
          razorpay_payment_id: payment.id,
          subscription_id: subscription?.id ?? null,
          status: "captured"
        })
        .eq("razorpay_order_id", payment.order_id);

      if (shop) {
        await supabase
          .from("shops")
          .update({ active_plan: "premium", plan_expires_at: expiresAt.toISOString() })
          .eq("id", shop.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
