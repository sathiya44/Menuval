import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const ratingSchema = z.object({
  shopId: z.string().uuid(),
  dishId: z.string().uuid().optional().nullable(),
  customerName: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable()
});

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit("ratings:create", 10, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many feedback attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    const payload = ratingSchema.parse(await request.json());
    const supabase = await createClient();

    const { error } = await (supabase as any).rpc("submit_public_rating", {
      p_shop_id: payload.shopId,
      p_dish_id: payload.dishId,
      p_customer_name: payload.customerName,
      p_rating: payload.rating,
      p_comment: payload.comment
    });

    if (error) {
      console.error("Rating submission failed", error);
      return NextResponse.json({ error: "Could not submit feedback." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid feedback details." }, { status: 400 });
    }

    console.error("Rating request failed", error);
    return NextResponse.json({ error: "Could not submit feedback." }, { status: 500 });
  }
}
