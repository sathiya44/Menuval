"use client";

import Script from "next/script";
import { useState } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function UpgradeButton({ vendorName, vendorEmail }: { vendorName: string; vendorEmail: string }) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    const response = await fetch("/api/razorpay/create-order", { method: "POST" });
    const order = await response.json();
    setLoading(false);

    if (!response.ok || !window.Razorpay) return;

    const checkout = new window.Razorpay({
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      name: "Menuval Premium",
      description: "Monthly premium vendor plan",
      order_id: order.orderId,
      prefill: {
        name: vendorName,
        email: vendorEmail
      },
      theme: {
        color: "#1d6848"
      }
    });

    checkout.open();
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Button type="button" onClick={startCheckout} disabled={loading}>
        {loading ? "Preparing checkout" : "Upgrade to premium"}
      </Button>
    </>
  );
}
