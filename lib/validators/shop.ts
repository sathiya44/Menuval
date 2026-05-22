import { z } from "zod";

export const shopSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and dashes only."),
  description: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  opening_hours: z.string().optional().nullable(),
  is_open: z.coerce.boolean().default(true)
});

export const dishSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  shop_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  category_name: z.string().optional().nullable(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0),
  offer_price: z.coerce.number().min(0).optional().nullable(),
  is_available: z.coerce.boolean().default(true),
  is_offer: z.coerce.boolean().default(false)
});

export const orderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "accepted", "preparing", "ready", "completed"])
});
