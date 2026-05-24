# Allo — Inventory Reservation System

Built to solve a real checkout problem — when a customer starts paying, we hold their unit for 10 minutes. If payment goes through, stock is confirmed. If not, the unit goes back automatically. No overselling, no manual cleanup.

---

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma + Neon** (Postgres)
- **Upstash** (Redis)
- **Tailwind CSS + shadcn/ui**

---

## Running Locally

**1. Install dependencies**
```bash
npm install
```

**2. Set up `.env` at the project root**
```env
DATABASE_URL=""              # from neon.tech
UPSTASH_REDIS_REST_URL=""    # from upstash.com
UPSTASH_REDIS_REST_TOKEN=""  # from upstash.com
CRON_SECRET="any_random_string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**3. Run migrations and seed**
```bash
npx prisma migrate dev
npx prisma db seed
```

**4. Start the server**
```bash
npm run dev
```

---

## How Expiry Works in Production

Two layers handle this:

1. **Vercel Cron** runs every minute and releases any reservations past their `expiresAt` time — units go back to stock automatically.
2. **Lazy cleanup** — if someone tries to confirm an expired reservation, the endpoint catches it right then, releases it, and returns a 410.

So even between cron runs, expired stock is never permanently locked.

---

## Trade-offs & What I'd Change

- **No auth** — reservations aren't tied to a user. In production, only the person who created a reservation should be able to confirm or cancel it.
- **Quantity is fixed at 1** in the UI. The API supports any quantity, just didn't build the picker.
- **Idempotency keys never expire** — they should be cleaned up after 24 hours. Didn't prioritise it since it doesn't affect correctness.
- **No real payment** — "Confirm" skips an actual payment gateway. In production this would be triggered by a payment webhook, not a button.
