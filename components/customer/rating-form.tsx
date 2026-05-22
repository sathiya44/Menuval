"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Dish } from "@/lib/database.types";

export function RatingForm({ shopId, dishes }: { shopId: string; dishes: Dish[] }) {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          dishId: formData.get("dishId") || null,
          customerName: formData.get("customerName"),
          rating: Number(formData.get("rating")),
          comment: formData.get("comment")
        })
      });
      setSent(true);
    });
  }

  return (
    <form action={submit} className="mt-6 grid gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold"><Star className="h-5 w-5 text-primary" />Leave feedback</div>
      {sent ? <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">Thanks for the feedback.</p> : null}
      <Input name="customerName" placeholder="Name" />
      <select name="dishId" className="h-10 rounded-md border bg-white px-3 text-sm">
        <option value="">Overall shop feedback</option>
        {dishes.map((dish) => <option key={dish.id} value={dish.id}>{dish.name}</option>)}
      </select>
      <select name="rating" required className="h-10 rounded-md border bg-white px-3 text-sm" defaultValue="5">
        {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
      </select>
      <Textarea name="comment" placeholder="What stood out?" />
      <Button disabled={isPending} type="submit">Submit feedback</Button>
    </form>
  );
}
