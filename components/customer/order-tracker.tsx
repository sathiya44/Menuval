"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, CookingPot, PackageCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { cn, currency, formatIstDateTime } from "@/lib/utils";
import type { OrderStatus } from "@/lib/database.types";

type TrackedOrder = {
  token: string;
  status: OrderStatus;
  total_amount: number;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  created_at: string;
  shops?: { name: string; slug: string } | null;
};

const steps: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: "pending", label: "Pending", icon: Clock },
  { status: "accepted", label: "Order accepted", icon: Clock },
  { status: "preparing", label: "Preparing", icon: CookingPot },
  { status: "ready", label: "Ready to serve", icon: PackageCheck },
  { status: "completed", label: "Completed", icon: CheckCircle2 }
];

export function OrderTracker({ token }: { token: string }) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${token}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error ?? "Could not track this order.");
        return;
      }

      setOrder(payload.order);
      setError("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Initial load only. Customers refresh manually to check updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!order) {
    return <p className="text-sm text-muted-foreground">Loading order status...</p>;
  }

  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === order.status)
  );
  const stageTimes: Record<OrderStatus, string | null> = {
    pending: order.created_at,
    accepted: order.accepted_at,
    preparing: order.preparing_at,
    ready: order.ready_at,
    completed: order.completed_at
  };

  return (
    <Card className="text-left">
      <CardContent className="grid gap-5 p-4">
        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{order.shops?.name ?? "Order"}</p>
            <p className="text-sm text-muted-foreground">
              Ordered at {formatIstDateTime(order.created_at)} IST - {currency(Number(order.total_amount))}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <Badge>{steps[currentIndex]?.label ?? order.status}</Badge>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={load}
              disabled={loading}
              aria-label="Refresh order status"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {order.shops?.slug ? (
          <Button asChild variant="outline" className="h-11 w-full">
            <Link href={`/menu/${order.shops.slug}?order=${order.token}`}>
              View menu / add items
            </Link>
          </Button>
        ) : null}

        <div className="grid gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isDone = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.status} className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border",
                    isDone ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className={cn("text-sm font-medium", isCurrent && "text-primary")}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stageTimes[step.status]
                      ? `${formatIstDateTime(stageTimes[step.status]!)} IST`
                      : isCurrent
                        ? "Current status"
                        : isDone
                          ? "Done"
                          : "Waiting"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
