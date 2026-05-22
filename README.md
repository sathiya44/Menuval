# Menuval MVP

Food menu discovery, QR ordering, and vendor management platform built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI primitives, Supabase, and Razorpay.

## Implementation Plan

1. Foundation: Next.js App Router, TypeScript, Tailwind, reusable UI components, Vercel-ready config.
2. Database: Supabase Postgres schema, relationships, RLS policies, storage buckets, profile trigger, realtime orders.
3. Auth: Supabase vendor signup/login, profile roles, vendor/admin route guards.
4. Vendor MVP: shop profile, image upload, public QR URL, dish/category management, offers, live order queue, reviews, subscription panel.
5. Customer MVP: discovery search, price/rating comparison, public QR menu, cart, order token, ratings and feedback.
6. Admin MVP: vendor moderation, featured shops, orders, subscriptions, reviews, basic analytics.
7. Payments: Razorpay order creation and signed webhook handler for premium subscription activation.

## Project Structure

```txt
app/
  (auth)/login, signup
  (customer)/discover
  admin/*
  api/orders, api/ratings, api/razorpay/*
  menu/[slug]
  order/[token]
  vendor/*
components/
  customer/
  dashboard/
  ui/
  vendor/
lib/
  actions/
  data/
  payments/
  supabase/
  validators/
supabase/schema.sql
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

3. Run `supabase/schema.sql` in the Supabase SQL editor.

4. In Supabase Auth, enable email/password auth. To create an admin, update a profile role:

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

5. Start development:

```bash
npm run dev
```

## Notes

- Customers browse without login.
- Vendors can create one shop, manage dishes, publish `/menu/[slug]`, and receive realtime orders.
- Free plan is limited to 10 dishes in server action logic.
- Premium activation is finalized by the Razorpay webhook after `payment.captured`.
- Supabase Storage buckets are public for MVP image delivery.
- Business logic is kept in `lib/actions`, `lib/data`, and API routes so heavier backend logic can later move to NestJS.
