"use client";

import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-sb-bg">
      <aside className="w-56 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/stackbot-logo-white.png"
            alt="StackBot Logo"
            width={80}
            height={80}
            className="bg-sb-primary rounded-full p-3"
          />
          <h1 className="text-xl font-bold text-gray-900 mt-3 tracking-tight">
            Vendor Portal
          </h1>
        </div>

        <nav className="space-y-4 flex-1 text-gray-700">
          <SidebarItem href="/vendor">Dashboard</SidebarItem>
          <SidebarItem href="/vendor/products">Products</SidebarItem>
          <SidebarItem href="/vendor/orders">Orders</SidebarItem>
          <SidebarItem href="/vendor/settings">Settings</SidebarItem>
        </nav>

        <button
          onClick={logout}
          className="w-full bg-sb-primary text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">{children}</main>
    </div>
  );
}

function SidebarItem({ href, children }: any) {
  return (
    <Link
      href={href}
      className="block text-lg font-medium text-gray-700 hover:text-sb-primary transition"
    >
      {children}
    </Link>
  );
}