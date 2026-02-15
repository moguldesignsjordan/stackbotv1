# CLAUDE.md - StackBot V1

## Project Overview

StackBot is a full-stack logistics and delivery platform for the Caribbean (Dominican Republic). It connects customers, vendors, and drivers in a marketplace-like ecosystem for on-demand delivery services. The platform supports multi-vendor orders, real-time delivery tracking, and comprehensive admin controls.

**Firebase Project ID**: `stackbot-a5e78`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| UI | React 19, Tailwind CSS 4, Lucide React icons |
| Backend | Firebase (Firestore, Auth, Cloud Functions, Storage) |
| Payments | Stripe (PaymentIntent flow) |
| Maps | Google Maps API via @react-google-maps/api |
| Mobile | Capacitor 8 (iOS & Android) |
| Hosting | Vercel (frontend), Firebase (functions/database) |
| State | React Context API (CartContext, LanguageContext, NotificationContext) |
| i18n | Custom translation system (English & Spanish) |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Home page (main entry point)
│   ├── layout.tsx              # Root layout with providers
│   ├── globals.css             # Global Tailwind styles
│   ├── error.tsx               # Error boundary
│   ├── global-error.tsx        # Global error boundary
│   ├── not-found.tsx           # 404 page
│   ├── login/                  # Authentication
│   ├── cart/                   # Shopping cart
│   ├── checkout/               # Checkout flow
│   ├── order-confirmation/     # Post-checkout confirmation
│   ├── search/                 # Product/vendor search
│   ├── categories/             # Category browsing
│   ├── store/[slug]/           # Individual vendor storefront
│   ├── track/[orderId]/        # Order tracking
│   ├── products/               # Product pages
│   ├── vendors/                # Vendor listing
│   ├── vendor-signup/          # Vendor registration
│   ├── vendor-contract/        # Vendor contract
│   ├── driver-signup/          # Driver registration
│   ├── about/                  # About page
│   ├── support/                # Support page
│   ├── partners/               # Partners page
│   ├── affiliate-signup/       # Affiliate program
│   ├── policies/               # Legal policies
│   ├── account/                # Customer account
│   │   ├── orders/             # Order history
│   │   ├── addresses/          # Saved addresses
│   │   └── settings/           # Account settings
│   ├── admin/                  # Admin dashboard
│   │   ├── analytics/          # Business analytics
│   │   ├── orders/             # Order management
│   │   ├── vendors/            # Vendor management
│   │   ├── customers/          # Customer management
│   │   ├── drivers/            # Driver management
│   │   ├── categories/         # Category management
│   │   └── settings/           # Admin settings
│   ├── vendor/                 # Vendor portal
│   │   ├── products/           # Product management
│   │   ├── orders/             # Vendor order view
│   │   ├── revenue/            # Revenue tracking
│   │   └── settings/           # Vendor settings
│   ├── driver/                 # Driver app
│   │   ├── dashboard/          # Driver dashboard
│   │   ├── delivery/[id]/      # Active delivery view
│   │   ├── earnings/           # Earnings tracking
│   │   ├── account/            # Driver account
│   │   ├── apply/              # Driver application
│   │   └── login/              # Driver login
│   └── api/                    # API routes (see API section)
├── components/                 # Reusable React components
│   ├── layout/                 # Header, Footer, Navigation
│   ├── admin/                  # Admin-specific components
│   ├── vendor/                 # Vendor-specific components
│   ├── driver/                 # Driver-specific components
│   ├── cart/                   # Shopping cart components
│   ├── maps/                   # Google Maps components
│   ├── paymets/                # Payment UI components (note: typo in dir name)
│   ├── notifications/          # Notification components
│   ├── tracking/               # Delivery tracking UI
│   ├── location/               # Location picker/selector
│   ├── ui/                     # Shared UI primitives
│   ├── PushNotificationProvider.tsx
│   └── PushDebug.tsx
├── contexts/                   # React Context providers
│   ├── CartContext.tsx          # Multi-vendor cart (localStorage-persisted)
│   ├── LanguageContext.tsx      # i18n (en/es)
│   └── NotificationContext.tsx  # In-app toast notifications
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts              # Firebase auth state management
│   ├── usePushNotifications.ts # Web push notifications
│   ├── useNativePush.ts        # Mobile push (Capacitor)
│   ├── useErrorHandler.ts      # Error handling hook
│   ├── useInAppPayment.ts      # Stripe payment hook
│   └── useDriverLocationBroadcast.ts # Driver GPS broadcasting
├── lib/                        # Utilities and configuration
│   ├── firebase/               # Firebase setup
│   │   ├── config.ts           # Client SDK init
│   │   ├── admin.ts            # Admin SDK init (server-side)
│   │   └── auth-utils.ts       # Auth helpers
│   ├── stripe/
│   │   └── stripe.ts           # Stripe client/helpers
│   ├── api/                    # API error handling utilities
│   ├── auth/
│   │   └── driverAuth.ts       # Driver auth utilities
│   ├── notifications/
│   │   ├── createNotification.ts       # Server-side notifications
│   │   └── createNotificationClient.ts # Client-side notifications
│   ├── config/
│   │   ├── categories.ts       # Master category definitions
│   │   └── vendor-categories.ts
│   ├── types/                  # TypeScript type definitions
│   │   ├── index.ts            # Core types (User, Vendor, Product, Order, etc.)
│   │   ├── order.ts            # Order & cart item types
│   │   ├── vendor.ts           # Vendor types
│   │   ├── driver.ts           # Driver & delivery types
│   │   ├── address.ts          # Address types
│   │   ├── location.ts         # Location types
│   │   ├── product.ts          # Product types
│   │   ├── notifications.ts    # Notification types
│   │   └── firestore.ts        # Firestore helper types
│   ├── translations/
│   │   └── index.ts            # All i18n strings (en/es)
│   └── utils/                  # Utility functions
│       ├── formatters.ts       # General formatting
│       ├── formatDate.ts       # Date formatting
│       ├── formatLocation.ts   # Location formatting
│       ├── currency.ts         # Currency formatting (DOP/USD)
│       ├── validators.ts       # Input validation
│       ├── errors.ts           # Error types
│       ├── errorHandler.ts     # Error handling utilities
│       ├── vendor-filters.ts   # Vendor filtering logic
│       ├── category-matching.ts # Category matching
│       ├── store-hours.ts      # Store hours logic
│       └── slug.ts             # URL slug utilities
└── types/
    └── capacitor-google-auth.d.ts  # Capacitor Google Auth typings

functions/                      # Firebase Cloud Functions (Node.js 20)
├── index.js                    # All cloud functions (~62KB, 28+ exports)
├── testOrders.js               # Test order utilities
├── package.json                # Functions dependencies
└── .eslintrc.js                # Functions linting config

android/                        # Capacitor Android project
ios/                            # Capacitor iOS project
public/                         # Static assets
```

---

## Development Commands

```bash
# Development
npm run dev                # Start Next.js dev server (port 3000)
npm run build              # Production build
npm run start              # Start production server
npm run lint               # Run ESLint

# Mobile (Capacitor)
npm run cap:sync           # Sync web build to native projects
npm run cap:ios            # Open iOS project in Xcode
npm run cap:android        # Open Android project in Android Studio
npm run mobile:ios         # Build + sync + open iOS
npm run mobile:android     # Build + sync + open Android
```

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orders` | GET/POST | List/create orders |
| `/api/orders/[id]` | GET/POST | Order details/updates |
| `/api/orders/confirm` | POST | Confirm payment |
| `/api/create-payment-intent` | POST | Create Stripe PaymentIntent |
| `/api/checkout` | POST | Create checkout session |
| `/api/checkout/session` | POST | Get session details |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/track-order` | GET | Track order by PIN |
| `/api/admin/customers` | GET/POST | Customer management |
| `/api/admin/customers/[id]` | GET/POST | Individual customer |
| `/api/admin/customers/[id]/stripe` | POST | Stripe customer ops |
| `/api/admin/delete-vendor` | POST | Remove vendor |
| `/api/admin/enable-user` | POST | Enable user account |
| `/api/admin/disable-user` | POST | Disable user account |
| `/api/customer/addresses` | GET/POST | Manage delivery addresses |
| `/api/debug/orders` | GET | Debug order data |

---

## Firestore Collections

| Collection | Purpose | Key Subcollections |
|------------|---------|-------------------|
| `users/{userId}` | General user data | `savedLocations/{id}` (max 10) |
| `customers/{id}` | Customer profiles | `orders/{id}`, `addresses/{id}` |
| `vendors/{id}` | Vendor profiles, location, bank info | `orders/{id}` |
| `drivers/{id}` | Driver profiles, vehicle, status, stats | `deliveries/{id}` |
| `orders/{id}` | Global orders | `delivery_queue/{id}` |
| `products/{id}` | Product catalog | - |
| `notifications/{id}` | User notifications | - |
| `pending_checkouts/{id}` | Pre-payment checkout data | - |
| `categories/{id}` | Category metadata | - |

---

## Authentication & Roles

- **Firebase Auth** with email/password, Google OAuth, and Apple Sign-In (iOS)
- **Role-based access** via Firebase custom claims: `admin`, `vendor`, `customer`, `driver`
- Firestore security rules enforce role-based read/write access
- Driver authentication has a separate flow (`/src/lib/auth/driverAuth.ts`)

---

## Key Business Logic

### Cart & Checkout
- Multi-vendor cart support (items grouped by vendor)
- Cart persisted to localStorage with versioning and migration
- Tax: **18% ITBIS** (Dominican Republic tax)
- Delivery fee: **$1.99 per vendor** in cart (client-side estimate)

### Delivery Fee Calculation (Cloud Functions)
- Base fee: **$3.00** for first 3km
- Per-km fee: **$0.50** per additional km
- Multi-vendor surcharge: **$1.99** per vendor
- Tax: **18% ITBIS** applied to fees

### Payment Flow
1. Frontend creates PaymentIntent via `/api/create-payment-intent`
2. Checkout data stored in Firestore `pending_checkouts`
3. Stripe Elements handles card input
4. Stripe webhook (`/api/webhooks/stripe`) confirms payment and creates orders

### Order Status Flow
Orders progress through statuses managed by Cloud Functions with notifications at each transition. Drivers can claim orders from the delivery queue.

---

## Cloud Functions (functions/index.js)

28+ exported functions organized by domain:

- **Auth**: `bootstrapAdmin`, `setUserRole`, `setDriverRole`
- **Vendors**: `createVendor`, `approveVendor`, `updateVendorLocation`
- **Orders**: `createOrder`, `updateOrderStatus`, `calculateDeliveryFeeForOrder`, `completeDelivery`
- **Drivers**: `claimOrder`, `updateDriverLocation`, `notifyDriverOfCustomerNote`
- **Notifications**: `onOrderCreated`, `onOrderStatusChange`, `onVendorStatusChange`, `onOrderAssignedToDriver`, `onOrderReadyForDelivery`, `sendBroadcastNotification`, `sendPushNotification`, `getFCMStatus`
- **Location**: `saveCustomerLocation`, `deleteCustomerLocation`, `onActiveDeliveryUpdate`, `onOrderCancelledCleanup`
- **Maintenance**: `cleanupOldNotifications` (scheduled daily)
- **Testing**: `createTestOrder`, `createTestOrderDev`, `deleteTestOrders`

---

## Environment Variables

Required in `.env.local` (not committed to repo):

```
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

---

## Coding Conventions

### TypeScript
- **Strict mode** enabled in tsconfig
- Path alias: `@/*` maps to `./src/*`
- Type definitions centralized in `src/lib/types/`
- Use existing types from `src/lib/types/index.ts` for core entities (User, Vendor, Product, Order, Customer, Category)

### React & Next.js
- **App Router** (not Pages Router) - all pages under `src/app/`
- Server components by default; add `"use client"` directive only when needed
- Contexts wrap the app in `src/app/layout.tsx`
- Components organized by domain (admin, vendor, driver, cart, etc.)

### Styling
- **Tailwind CSS 4** for all styling
- Mobile-first responsive design
- No CSS modules or styled-components

### State Management
- React Context for global state (cart, language, notifications)
- No Redux or Zustand - keep it simple with Context API
- Cart state persisted to localStorage

### Internationalization
- All user-facing strings should use the translation system
- Translations in `src/lib/translations/index.ts`
- Access via `useLanguage()` hook: `const { t } = useLanguage()`
- Two languages: English (`en`) and Spanish (`es`)

### Firebase
- Client SDK initialized in `src/lib/firebase/config.ts`
- Admin SDK initialized in `src/lib/firebase/admin.ts` (server-side only)
- Cloud Functions written in plain JavaScript (not TypeScript) in `functions/index.js`
- Firestore security rules in `firestore.rules`

### ESLint Rules
- Extends `next/core-web-vitals`
- `react/no-unescaped-entities`: off
- `@next/next/no-img-element`: warn
- `jsx-a11y/alt-text`: warn

### npm
- `legacy-peer-deps=true` set in `.npmrc`

---

## Vendor Categories

10 categories defined in `src/lib/config/categories.ts`:

1. Restaurants
2. Groceries
3. Taxi Service
4. Beauty & Wellness
5. Professional Services
6. Home Repair & Maintenance
7. Retail Shops
8. Electronics & Gadgets
9. Tours & Activities
10. Cleaning Services

---

## Mobile App (Capacitor)

- **App ID**: `com.stackbotglobal.app`
- **App Name**: StackBot
- Native features: Camera, Push Notifications, Google Auth, Apple Sign-In, Location Services
- Build process: Next.js build -> Capacitor sync -> Native IDE

---

## Known Quirks

- The `src/components/paymets/` directory has a typo (should be "payments")
- Cloud Functions are in plain JavaScript (`functions/index.js`), not TypeScript
- The home page (`src/app/page.tsx`) is very large (~66KB) - consider splitting
- `vercel.json` forces cache busting on every build (`VERCEL_FORCE_NO_BUILD_CACHE=1`)
- Images are set to `unoptimized: true` in Next.js config

---

## Important Files Reference

| Purpose | File |
|---------|------|
| Home page | `src/app/page.tsx` |
| Root layout | `src/app/layout.tsx` |
| Cart logic | `src/contexts/CartContext.tsx` |
| Auth hook | `src/hooks/useAuth.ts` |
| Firebase config | `src/lib/firebase/config.ts` |
| Firebase admin | `src/lib/firebase/admin.ts` |
| Stripe setup | `src/lib/stripe/stripe.ts` |
| Type definitions | `src/lib/types/index.ts` |
| Translations | `src/lib/translations/index.ts` |
| Categories | `src/lib/config/categories.ts` |
| Cloud Functions | `functions/index.js` |
| Firestore rules | `firestore.rules` |
| Firestore indexes | `firestore.indexes.json` |
| Next.js config | `next.config.ts` |
| Capacitor config | `capacitor.config.ts` |
