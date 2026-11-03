# Fashi

A clothing e-commerce store: shoppers browse and search products, sign up with
an email OTP, manage a cart and addresses, apply coupons, and pay by cash on
delivery, wallet or Razorpay. Orders can be cancelled or returned, with refunds
to the wallet. Admins manage products, categories, coupons, banners, users and
orders, and see a sales dashboard.

## Stack

Node.js · Express 5 · MongoDB (Mongoose) · Handlebars (server-rendered) ·
express-session with a MongoDB store · Cloudinary · Razorpay · Nodemailer · zod ·
node:test + supertest

## Structure

```
routes/        URL → middleware (login check, CSRF, upload, validation) → controller
controllers/   read the request, call a service, render a page or send JSON
services/      business logic: auth, cart, coupons, orders, wallet, catalog, admin
middleware/    auth, CSRF, uploads, rate limiting, error page
models/        Mongoose schemas
validators/    zod schemas for every form
views/         Handlebars pages, layout and partials
scripts/       create-admin, legacy data migration
tests/         tests against an in-memory MongoDB
```

### How it stays safe

- **CSRF:** every form and AJAX request that changes data carries a per-session
  token, and every such action is a POST; GET requests only read.
- **Sessions:** stored in MongoDB, `httpOnly` + `sameSite=lax` cookies,
  regenerated on login, destroyed on logout. Blocked users are logged out on
  their next request.
- **Passwords:** bcrypt for shoppers and admin. Password reset uses a random,
  single-use token (stored hashed) that expires after 30 minutes.
- **Ownership:** shoppers can only see and change their own orders and addresses.
- **Money:**
  - totals, coupon discounts and stock are always computed on the server;
  - stock and wallet balance are changed in single atomic updates;
  - Razorpay payments are verified against the order created for that checkout,
    and cannot be replayed;
  - refunds happen at most once per order.
- **Uploads:** checked for an admin session first, kept in memory and streamed to
  Cloudinary; nothing is written to the server's disk.

## Running locally

```bash
cp .env.example .env            # fill in the values
npm install
npm run create-admin -- admin@example.com "a strong password"
npm run dev                     # http://localhost:3000
```

| Script | |
|---|---|
| `npm start` | start the server |
| `npm run dev` | start with auto-restart |
| `npm test` | run the tests (no external services needed) |
| `npm run lint` | ESLint |
| `npm run create-admin -- <email> <password>` | create or reset the admin account |

### Upgrading an existing database

Data written by the old version (plain-number admin password, string user ids on
orders, mixed-case emails) is upgraded with:

```bash
node scripts/migrate-legacy-data.js
```

It is safe to run more than once and prints what it changed. Banner images from
the old version were stored on the server's disk and must be uploaded again in
the admin panel.
