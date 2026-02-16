# CLAUDE.md — StackBot V1

## Project Overview

StackBot is a multi-platform delivery and logistics platform for the Caribbean region. It supports web (Next.js on Vercel), iOS, and Android (via Capacitor). The platform connects customers, vendors, drivers, and administrators through a unified codebase.

- **Domain**: stackbotglobal.com
- **Firebase Project**: stackbot-a5e78
- **Default Language**: Spanish (es) with English support
- **Currency**: USD and DOP (Dominican Peso)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, React 19, TypeScript 5) |
| Styling | Tailwind CSS 4 via PostCSS |
| Database | Cloud Firestore (NoSQL) |
| Auth | Firebase Authentication with custom JWT claims |
| Storage | Firebase Storage |
| Payments | Stripe (Checkout Sessions + Payment Intents) |
| Maps | Google Maps via @react-google-maps/api |
| Mobile | Capacitor 8 (iOS + Android) |
| Hosting | Vercel (web), Firebase Hosting (fallback) |
| Serverless | Firebase Cloud Functions |
| Icons | Lucide React |

## Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint (next/core-web-vitals)

# Mobile
npm run cap:sync         # Sync web build to native projects
npm run cap:ios          # Open iOS project in Xcode
npm run cap:android      # Open Android project in Android Studio
npm run mobile:ios       # Build + sync + open iOS
npm run mobile:android   # Build + sync + open Android

# Firebase Cloud Functions (from /functions directory)
npm run deploy           # Deploy functions
npm run serve            # Local emulator
npm run logs             # View function logs
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/                # API endpoints (checkout, orders, admin, webhooks)
│   ├── account/            # Customer account pages
│   ├── admin/              # Admin dashboard
│   ├── vendor/             # Vendor dashboard
│   ├── driver/             # Driver dashboard
│   ├── cart/               # Shopping cart
│   ├── checkout/           # Checkout flow
│   ├── track/              # Order tracking
│   └── layout.tsx          # Root layout with providers
├── components/             # React components
│   ├── layout/             # Header, Footer, Navigation
│   ├── ui/                 # Reusable UI (Toast, buttons, etc.)
│   ├── admin/              # Admin-specific components
│   ├── vendor/             # Vendor components
│   ├── driver/             # Driver tracking components
│   ├── maps/               # Google Maps components
│   ├── cart/               # Cart components
│   ├── orders/             # Order components
│   ├── paymets/            # Payment/Stripe components (note: typo in dir name)
│   └── tracking/           # Delivery tracking
├── contexts/               # React Context providers
│   ├── CartContext.tsx      # Shopping cart state
│   ├── LanguageContext.tsx  # i18n (EN/ES) & currency (USD/DOP)
│   └── NotificationContext.tsx
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Firebase auth hook
│   ├── useNativePush.ts    # Native push notifications
│   ├── useNativeGeolocation.ts
│   ├── useDriverLocationBroadcast.ts
│   ├── useInAppPayment.ts
│   └── useErrorHandler.ts
├── lib/
│   ├── firebase/           # Firebase config (config.ts, admin.ts, auth-utils.ts)
│   ├── stripe/             # Stripe setup (stripe.ts)
│   ├── types/              # TypeScript types (order, vendor, driver, product, etc.)
│   ├── api/                # API error handling
│   ├── notifications/      # Notification helpers
│   ├── utils/              # Utilities (currency, formatters, etc.)
│   ├── config/             # Static config (categories)
│   └── translations/       # i18n translation files
└── types/                  # Additional type declarations

functions/                  # Firebase Cloud Functions (Node.js)
├── index.js                # All cloud functions (~3300 lines)
└── package.json

android/                    # Android native project (Capacitor)
ios/                        # iOS native project (Capacitor)
scripts/                    # Database migration scripts
```

## Architecture & Patterns

### Path Alias
All imports from `src/` use the `@/*` alias:
```ts
import { auth } from "@/lib/firebase/config";
```

### State Management
- **React Context** for client state: Cart, Language/Currency, Notifications
- **Firestore** as the source of truth for all persistent data
- No Redux or external state library

### Authentication & Authorization
- Firebase Authentication with Google and Apple sign-in
- **Role-based access** via custom JWT claims: `admin`, `vendor`, `customer`, `driver`
- API routes verify tokens via `Authorization: Bearer <idToken>` headers
- Firestore security rules enforce role-based field-level access
- Protected vendor fields: `verified`, `role`, `stackbot_pin`, `uid`

### Provider Hierarchy (layout.tsx)
```
LanguageProvider → ToastProvider → CartProvider → NotificationProvider → PushNotificationProvider
```

### Multi-Vendor Order Flow
1. Customer adds items from multiple vendors to cart
2. Checkout groups items by vendor
3. Single Stripe session created with all vendor items
4. On payment success, separate orders are created per vendor
5. Each vendor order gets its own delivery fee and tax calculation

### Payment Processing
- **Web**: Stripe Checkout Sessions (redirect flow)
- **Mobile**: Stripe Payment Intents (in-app flow)
- **Webhooks**: `POST /api/webhooks/stripe` handles `checkout.session.completed` and `payment_intent.succeeded`
- **Fee structure**: $1.99 base delivery + $0.50/km after 3km, 18% ITBIS tax

## API Routes

All protected endpoints require `Authorization: Bearer <firebase-id-token>`.

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/checkout` | Create Stripe checkout session |
| GET | `/api/checkout/session` | Get checkout session details |
| POST | `/api/create-payment-intent` | Create payment intent (mobile) |
| GET | `/api/orders` | List orders (role-filtered) |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/[id]` | Get order by ID |
| POST | `/api/orders/confirm` | Confirm order receipt |
| GET | `/api/track-order` | Track order status |
| POST | `/api/customer/addresses` | Save delivery addresses |
| GET | `/api/admin/customers` | List all customers (admin) |
| GET | `/api/admin/customers/[id]` | Get customer details (admin) |
| POST | `/api/admin/disable-user` | Disable user (admin) |
| POST | `/api/admin/enable-user` | Enable user (admin) |
| POST | `/api/admin/delete-vendor` | Delete vendor (admin) |
| POST | `/api/webhooks/stripe` | Stripe webhook (signature verified) |

## Firestore Collections

**Top-level**: `users`, `customers`, `vendors`, `drivers`, `orders`, `products`, `categories`, `notifications`, `pending_checkouts`, `delivery_queue`, `driver_deliveries`, `driver_applications`, `audit_logs`, `promo_codes`, `settings`, `reviews`, `affiliate_applications`

**Vendor subcollections**: `products`, `services`, `units`, `vehicles`, `experiences`, `orders`, `notifications`, `reviews`

**Customer subcollections**: `orders`, `favorites`, `addresses`

**User subcollections**: `savedLocations`

**Key indexes** (see `firestore.indexes.json`):
- Orders: `vendorId + createdAt`, `customerId + createdAt`, `status + createdAt`
- Delivery queue: `status + priority`, `driverId + status`
- Vendors: `status + created_at`

## Environment Variables

### Public (NEXT_PUBLIC_*)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL          # https://www.stackbotglobal.com
```

### Server-side
```
FIREBASE_PROJECT_ID          # stackbot-a5e78
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_STORAGE_BUCKET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

## Code Conventions

- **TypeScript strict mode** is enabled
- **Path alias**: `@/*` maps to `./src/*`
- **Component structure**: Pages in `src/app/`, components in `src/components/`, organized by feature domain
- **Type definitions**: Centralized in `src/lib/types/` with separate files per domain (order.ts, vendor.ts, driver.ts, product.ts, etc.)
- **Firebase client** is initialized in `src/lib/firebase/config.ts`; server admin SDK in `src/lib/firebase/admin.ts`
- **Custom hooks** follow the `use` prefix convention and live in `src/hooks/`
- **Context providers** live in `src/contexts/`
- **API route handlers** use Next.js App Router conventions (`route.ts` files)
- **Error handling**: Centralized in `src/lib/api/error-handler.ts`
- **Image optimization**: Uses Next.js Image component with AVIF/WebP formats via Vercel
- **CSS**: Tailwind utility classes; no CSS modules or styled-components

## ESLint Configuration

- Extends `next/core-web-vitals`
- `react/no-unescaped-entities`: off
- `@next/next/no-img-element`: warn
- `jsx-a11y/alt-text`: warn

## Deployment

- **Web**: Vercel (auto-deploys on push). Build command: `rm -rf .next && next build` (no build cache).
- **Mobile**: Capacitor syncs web build to native iOS/Android projects for App Store / Google Play distribution.
- **Firebase**: Cloud Functions deployed via `firebase deploy --only functions`. Firestore rules via `firebase deploy --only firestore:rules`.

## Testing

No automated test framework is currently configured. There are no test files or test runners in the project.

## Important Notes for AI Assistants

1. **No test suite exists** — do not reference or attempt to run tests unless one is added.
2. The `components/paymets/` directory has a typo (should be "payments") — preserve this spelling to avoid breaking imports.
3. The root layout uses `lang="es"` (Spanish) as the default language.
4. Firestore security rules are in `firestore.rules` — coordinate any schema changes with rule updates.
5. The `functions/index.js` file is a large monolith (~3300 lines) containing all Cloud Functions. It is plain JavaScript (not TypeScript).
6. Stripe API version is `2025-12-15.clover`.
7. Capacitor config points to `https://stackbotglobal.com` as the server URL for mobile apps.
8. The `next.config.ts` includes a rewrite from `/__/auth/*` to Firebase's auth handler — do not remove this.
9. Coordinates are validated in both Firestore rules and application code (lat: -90 to 90, lng: -180 to 180).
10. Multi-vendor checkout stores temporary data in the `pending_checkouts` collection, which is cleaned up after webhook processing.
