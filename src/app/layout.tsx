// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "StackBot",
  description: "Smart Logistics for the Caribbean",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sb-bg text-gray-900 antialiased">
        <ToastProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}