import { NextResponse } from "next/server";
import { requireRole } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay, premiumPlanAmount } from "@/lib/payments/razorpay";

export async function POST() {
  const profile = await requireRole(["vendor", "admin"]);
  const supabase = createAdminClient();
  const razorpay = getRazorpay();

  const order = await razorpay.orders.create({
    amount: premiumPlanAmount,
    currency: "INR",
    receipt: `premium_${profile.id}_${Date.now()}`,
    notes: {
      vendor_id: profile.id,
      plan: "premium"
    }
  });

  await supabase.from("payments").insert({
    vendor_id: profile.id,
    razorpay_order_id: order.id,
    amount: premiumPlanAmount / 100,
    currency: "INR",
    status: "created"
  });

  return NextResponse.json({
    key: process.env.RAZORPAY_KEY_ID,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    message: "Use this response with Razorpay Checkout on the client."
  });
}
