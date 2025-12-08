import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StackBot",
  description: "Smart Logistics for the Caribbean",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
<body className="min-h-screen bg-sb-bg text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}