// src/app/support/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support | StackBot',
  description:
    'Get help with StackBot. Contact support, find answers to common questions, or reach our team for assistance.',
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}