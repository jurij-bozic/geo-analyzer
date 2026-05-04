import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'GEO Analyzer',
  description: 'Discover your visibility in LLM responses and improve it',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
