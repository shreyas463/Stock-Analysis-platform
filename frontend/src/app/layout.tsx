import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';
import VercelAnalytics from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stock Analysis Platform',
  description: 'Your Modern Trading Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#1E2132] text-white min-h-screen`}>
        <ClientLayout>{children}</ClientLayout>
        <VercelAnalytics />
      </body>
    </html>
  );
}
