'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ky from 'ky';

export function ScanForm(): JSX.Element {
  const router = useRouter();
  const [brandName, setBrandName] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await ky
        .post('/api/scan', {
          json: { brandName, url },
        })
        .json<{ scanId: string }>();

      router.push(`/scan/${response.scanId}`);
    } catch (err) {
      console.error('Error creating scan:', err);
      setError('Failed to start scan. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div>
        <label htmlFor="brandName" className="block text-sm font-bold text-white mb-2">
          Brand Name
        </label>
        <input
          id="brandName"
          type="text"
          placeholder="Acme Corp"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          required
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 transition-all duration-300 backdrop-blur-sm"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-bold text-white mb-2">
          Website URL
        </label>
        <input
          id="url"
          type="url"
          placeholder="https://acme.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-400 transition-all duration-300 backdrop-blur-sm"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="px-4 py-3 bg-rose-500/20 border border-rose-400/50 rounded-lg text-rose-200 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold rounded-lg hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {isLoading ? 'Analyzing your brand...' : '🚀 Analyze my brand'}
      </button>
    </form>
  );
}
