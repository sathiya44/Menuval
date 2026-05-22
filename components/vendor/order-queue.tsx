"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ListOrdered } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOrderStatus } from "@/lib/actions/vendor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currency, formatIstDateTime } from "@/lib/utils";
import type { Order, OrderItem, OrderStatus } from "@/lib/database.types";

type OrderWithItems = Order & { order_items: OrderItem[] };
const statuses: OrderStatus[] = ["accepted", "preparing", "ready", "completed"];
const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Order accepted",
  preparing: "Preparing",
  ready: "Ready to serve",
  completed: "Completed"
};
const actionLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accept order",
  preparing: "Preparing",
  ready: "Ready to serve",
  completed: "Completed"
};

export function OrderQueue({ shopId, initialOrders }: { shopId: string; initialOrders: OrderWithItems[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const refreshOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true });
    setOrders((data ?? []) as unknown as OrderWithItems[]);
  }, [shopId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`orders:${shopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` },
        async () => {
          await refreshOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, supabase, refreshOrders]);

  function changeStatus(event: FormEvent<HTMLFormElement>, orderId: string, status: OrderStatus) {
    event.preventDefault();
    setError("");

    const previousOrders = orders;
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order))
    );

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateOrderStatus(formData);

      if (!result.ok) {
        setOrders(previousOrders);
        setError(result.error || "Could not update order status.");
        return;
      }

      await refreshOrders();
      router.refresh();
    });
  }

  const activeOrders = orders
    .filter((order) => order.status !== "completed")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const completedOrders = orders
    .filter((order) => order.status === "completed")
    .sort((a, b) => new Date(b.completed_at ?? b.updated_at).getTime() - new Date(a.completed_at ?? a.updated_at).getTime());
  const groupedCompleted = groupCompletedOrders(completedOrders);

  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No orders yet. New QR orders will appear here in realtime.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 rounded-md border bg-card p-1 sm:flex">
          <Button
            type="button"
            variant={tab === "active" ? "default" : "ghost"}
            size="sm"
            className="w-full"
            onClick={() => setTab("active")}
          >
            <ListOrdered className="h-4 w-4" />
            Queue ({activeOrders.length})
          </Button>
          <Button
            type="button"
            variant={tab === "completed" ? "default" : "ghost"}
            size="sm"
            className="w-full"
            onClick={() => setTab("completed")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedOrders.length})
          </Button>
        </div>
        {activeOrders[0] ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            Serve first: <span className="font-medium text-foreground">Token {activeOrders[0].token}</span>
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {tab === "active" && activeOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Active queue is clear.
          </CardContent>
        </Card>
      ) : null}

      {tab === "active" ? activeOrders.map((order, index) => (
        <Card key={order.id}>
          <CardContent className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[1fr_220px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={index === 0 ? "default" : "outline"}>
                  {index === 0 ? "Serve now" : `#${index + 1} in queue`}
                </Badge>
                <h2 className="font-semibold">Token {order.token}</h2>
                <Badge variant={order.status === "completed" ? "secondary" : "default"}>
                  {statusLabels[order.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">{formatIstDateTime(order.created_at)} IST</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.customer_name ?? "Walk-in"} {order.customer_phone ? `- ${order.customer_phone}` : ""}
              </p>
              <ul className="mt-3 grid gap-1 text-sm">
                {order.order_items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>{item.quantity} x {item.dish_name}</span>
                    <span>{currency(Number(item.unit_price) * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-medium">Total {currency(Number(order.total_amount))}</p>
              {order.note ? <p className="mt-2 text-sm text-muted-foreground">Note: {order.note}</p> : null}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {statuses.map((status) => (
                <form
                  key={status}
                  onSubmit={(event) => changeStatus(event, order.id, status)}
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="status" value={status} />
                  <Button
                    className="h-11 w-full"
                    type="submit"
                    variant={order.status === status ? "default" : "outline"}
                    disabled={isPending}
                  >
                    {actionLabels[status]}
                  </Button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>
      )) : null}

      {tab === "completed" ? (
        <div className="grid gap-5">
          {completedOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No completed orders yet.
              </CardContent>
            </Card>
          ) : null}
          {groupedCompleted.map((group) => (
            <section key={group.label} className="grid gap-3">
              <div className="rounded-md border bg-muted px-3 py-2 text-sm font-medium">
                {group.label}
              </div>
              {group.orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="grid gap-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">Token {order.token}</h2>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        {formatIstDateTime(order.completed_at ?? order.updated_at)} IST
                      </span>
                    </div>
                    <ul className="grid gap-1 text-sm">
                      {order.order_items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span>{item.quantity} x {item.dish_name}</span>
                          <span>{currency(Number(item.unit_price) * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="font-medium">Total {currency(Number(order.total_amount))}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function groupCompletedOrders(orders: OrderWithItems[]) {
  const groups = new Map<string, OrderWithItems[]>();

  orders.forEach((order) => {
    const value = order.completed_at ?? order.updated_at;
    const label = dateGroupLabel(value);
    groups.set(label, [...(groups.get(label) ?? []), order]);
  });

  return Array.from(groups.entries()).map(([label, groupedOrders]) => ({
    label,
    orders: groupedOrders
  }));
}

function dateGroupLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const istDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(yesterdayDate);

  if (istDate === today) return "Today";
  if (istDate === yesterday) return "Yesterday";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata"
  }).format(date);
}
