// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";

// ✅ LCP FIX: Use next/font for zero-FOUT font loading
// This eliminates render-blocking external font requests entirely.
// The font is self-hosted by Next.js and preloaded with display: swap.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  // ✅ Only load weights you actually use to reduce font file size
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "StackBot",
  description: "Smart Logistics for the Caribbean",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#55529d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* ✅ LCP FIX: Preconnect to Firebase Storage (where all product images live)
            This shaves ~100-200ms off the first image request by establishing
            the TCP + TLS handshake early, before the browser discovers <img> tags.
            
            ROLLBACK: Remove these two <link> tags — no functional impact, just slower images. */}
        <link
          rel="preconnect"
          href="https://firebasestorage.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://firebasestorage.googleapis.com"
        />

        {/* ✅ LCP FIX: Preconnect to Google APIs (used by Maps, Fonts, Auth)
            Only beneficial if Google Maps loads on the current page — but
            dns-prefetch is cheap enough to always include. */}
        <link
          rel="preconnect"
          href="https://maps.googleapis.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />

        {/* ✅ Preconnect to Stripe (loaded on checkout pages) */}
        <link
          rel="dns-prefetch"
          href="https://js.stripe.com"
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-sb-bg text-gray-900 antialiased pt-[0px]`}
      >
        <LanguageProvider>
          <ToastProvider>
            <CartProvider>
              <NotificationProvider>
                <PushNotificationProvider>
                  {children}
                </PushNotificationProvider>
              </NotificationProvider>
            </CartProvider>
          </ToastProvider>
        </LanguageProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}