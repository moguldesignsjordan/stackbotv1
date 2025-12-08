"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<null | boolean>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      const token = await getIdTokenResult(user);

      if (token.claims.role === "admin") {
        setAllowed(true);
      } else {
        router.replace("/");
      }
    });

    return () => unsub();
  }, []);

  if (allowed === null)
    return <LoadingSpinner text="Checking admin access..." />;

  return <>{children}</>;
}
