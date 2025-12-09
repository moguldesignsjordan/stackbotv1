"use client";

import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { Menu, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function VendorTopbar() {
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
      <Link href="/vendor">
        <Image
          src="/stackbot-logo-purp.png"
          alt="StackBot Vendor"
          width={120}
          height={32}
        />
      </Link>

      <button
        onClick={logout}
        className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  );
}
