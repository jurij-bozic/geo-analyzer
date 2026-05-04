import { ScanForm } from '@/components/ScanForm';

export default function Home(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Does AI know your brand?
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Find out if ChatGPT and Claude recommend you — and how to fix it if they don't.
          </p>
        </div>

        <ScanForm />
      </div>
    </main>
  );
}
