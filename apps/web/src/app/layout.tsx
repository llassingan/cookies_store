import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import '../styles/globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Maison Croûte — Hand-baked cookies, made for tomorrow',
  description:
    'A small home bakery crafting European-style cookies with slow ingredients and same-day attention. Order before 5pm for tomorrow’s bake.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-body">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
