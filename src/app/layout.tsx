// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { PushDebug } from "@/components/PushDebug";

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
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-sb-bg text-gray-900 antialiased pt-[0px] ">
        <LanguageProvider>
          <ToastProvider>
            <CartProvider>
              <NotificationProvider>
<PushNotificationProvider>
  {children}
  <PushDebug /> 
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