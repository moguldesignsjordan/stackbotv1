// src/app/driver/layout.tsx
'use client';

import { usePathname } from 'next/navigation';
import DriverGuard from '@/components/driver/DriverGuard';

// Pages that don't require authentication
const publicPaths = ['/driver/login', '/driver/apply'];

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Skip auth guard for public pages (login, apply)
  const isPublicPage = publicPaths.some(path => pathname === path);
  
  if (isPublicPage) {
    return <>{children}</>;
  }

  return <DriverGuard>{children}</DriverGuard>;
}