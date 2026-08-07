import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DDF Natural Language Query Builder',
  description: 'Turn a plain-English real estate search into a DDF query.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body bg-ink-950 text-paper min-h-screen">{children}</body>
    </html>
  );
}
