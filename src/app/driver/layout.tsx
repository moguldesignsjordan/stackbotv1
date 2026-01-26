// src/app/driver/layout.tsx
'use client';

import DriverGuard from '@/components/driver/DriverGuard';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DriverGuard>{children}</DriverGuard>;
}