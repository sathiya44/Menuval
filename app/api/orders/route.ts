import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createOrderToken } from "@/lib/security/tokens";

const orderSchema = z.object({
  shopId: z.string().uuid(),
  orderToken: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  items: z.array(z.object({ dishId: z.string().uuid(), quantity: z.number().int().positive() })).min(1)
});

type OrderItemPayload = {
  dish_id: string;
  dish_name: string;
  quantity: number;
  unit_price: number;
};

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit("orders:create", 20, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many order attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    const payload = orderSchema.parse(await request.json());
    const supabase = await createClient();

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id, is_open, is_approved, is_restricted")
      .eq("id", payload.shopId)
      .eq("is_approved", true)
      .eq("is_restricted", false)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: "Shop was not found." }, { status: 404 });
    }

    if (!shop.is_open) {
      return NextResponse.json({ error: "Shop is currently closed." }, { status: 400 });
    }
    if (!shop.is_approved || shop.is_restricted) {
      return NextResponse.json({ error: "Shop is not accepting public orders yet." }, { status: 400 });
    }

    const dishIds = payload.items.map((item) => item.dishId);
    const { data: dishes, error: dishesError } = await supabase
      .from("dishes")
      .select("id, name, price, offer_price, is_available")
      .eq("shop_id", payload.shopId)
      .in("id", dishIds);

    if (dishesError) {
      console.error("Order dish lookup failed", dishesError);
      return NextResponse.json({ error: "Could not submit order." }, { status: 500 });
    }

    const dishMap = new Map((dishes ?? []).map((dish) => [dish.id, dish]));
    const orderItems = payload.items.map((item) => {
      const dish = dishMap.get(item.dishId);
      if (!dish?.is_available) throw new Error("One or more dishes are unavailable.");
      return {
        dish_id: dish.id,
        dish_name: dish.name,
        quantity: item.quantity,
        unit_price: Number(dish.offer_price ?? dish.price)
      };
    });
    const total = orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    if (payload.orderToken) {
      const { data: existingOrder, error: existingOrderError } = await (supabase as any).rpc(
        "get_public_order_for_append",
        { p_token: payload.orderToken.toUpperCase() }
      );

      let orderForAppend = Array.isArray(existingOrder) ? existingOrder[0] : existingOrder;

      if (existingOrderError || !orderForAppend) {
        console.error("Order append lookup RPC failed, trying server fallback", existingOrderError);
        orderForAppend = await getOrderForAppendWithAdmin(payload.orderToken);
      }

      if (!orderForAppend) {
        return NextResponse.json({ error: "Original order was not found." }, { status: 404 });
      }

      if (orderForAppend.shop_id !== payload.shopId) {
        return NextResponse.json({ error: "Items can only be added from the same shop menu." }, { status: 400 });
      }

      if (!["ready", "completed"].includes(orderForAppend.status)) {
        const { error: appendError } = await (supabase as any).rpc("append_public_order_items", {
          p_token: orderForAppend.token,
          p_note: payload.note,
          p_total_amount: total,
          p_items: orderItems
        });

        if (appendError) {
          console.error("Order append RPC failed, trying server fallback", appendError);
          const fallback = await appendOrderWithAdmin(orderForAppend.id, payload.note, total, orderItems);
          if (!fallback.ok) {
            return NextResponse.json({ error: fallback.error }, { status: 500 });
          }
        }

        return NextResponse.json({ token: orderForAppend.token, appended: true });
      }
    }

    const token = createOrderToken();
    const { data: orderToken, error } = await (supabase as any).rpc("create_public_order", {
      p_shop_id: payload.shopId,
      p_token: token,
      p_customer_name: payload.customerName,
      p_customer_phone: payload.customerPhone,
      p_note: payload.note,
      p_total_amount: total,
      p_items: orderItems
    });

    if (error || !orderToken) {
      console.error("Order creation RPC failed, trying server fallback", error);
      const fallback = await createOrderWithAdmin({
        shopId: payload.shopId,
        token,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        note: payload.note,
        total,
        orderItems
      });

      if (!fallback.ok) {
        return NextResponse.json({ error: fallback.error }, { status: 500 });
      }

      return NextResponse.json({ token: fallback.token, appended: false });
    }

    return NextResponse.json({ token: orderToken, appended: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid order details." }, { status: 400 });
    }

    console.error("Order submission failed", error);
    return NextResponse.json({ error: "Could not submit order." }, { status: 500 });
  }
}

async function createOrderWithAdmin({
  shopId,
  token,
  customerName,
  customerPhone,
  note,
  total,
  orderItems
}: {
  shopId: string;
  token: string;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
  total: number;
  orderItems: OrderItemPayload[];
}) {
  try {
    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("orders")
      .insert({
        shop_id: shopId,
        token,
        customer_name: customerName,
        customer_phone: customerPhone,
        note,
        status: "pending",
        total_amount: total
      })
      .select("id, token")
      .single();

    if (error || !order) {
      return { ok: false, error: error?.message ?? "Could not create order." };
    }

    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

    if (itemsError) {
      await admin.from("orders").delete().eq("id", order.id);
      return { ok: false, error: itemsError.message };
    }

    return { ok: true, token: order.token };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create order."
    };
  }
}

async function getOrderForAppendWithAdmin(token: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .select("id, token, status, total_amount, shop_id, shops(is_approved, is_restricted)")
      .eq("token", token.toUpperCase())
      .single();

    if (!data) return null;

    const shop = Array.isArray(data.shops) ? data.shops[0] : data.shops;
    if (!shop?.is_approved || shop.is_restricted) return null;

    return data;
  } catch {
    return null;
  }
}

async function appendOrderWithAdmin(
  orderId: string,
  note: string | null | undefined,
  total: number,
  orderItems: OrderItemPayload[]
) {
  try {
    const admin = createAdminClient();
    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItems.map((item) => ({ ...item, order_id: orderId })));

    if (itemsError) {
      return { ok: false, error: itemsError.message };
    }

    const { data: order } = await admin
      .from("orders")
      .select("total_amount, note")
      .eq("id", orderId)
      .single();

    const { error: updateError } = await admin
      .from("orders")
      .update({
        total_amount: Number(order?.total_amount ?? 0) + total,
        note: note || order?.note || null
      })
      .eq("id", orderId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true, error: "" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update order."
    };
  }
}
