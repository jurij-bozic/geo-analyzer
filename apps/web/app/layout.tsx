import type { Metadata } from 'next';
import '../globals.css';
import { Providers } from './providers';

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
