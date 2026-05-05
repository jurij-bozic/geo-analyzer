import { ScanForm } from '@/components/ScanForm';

export default function Home(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center mb-2">
            <span className="text-5xl">🔍</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Does AI know<br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">your brand?</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-md mx-auto">
            Find out if ChatGPT and Claude recommend you — and get actionable steps to improve your visibility.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 hover:border-white/30 transition-all duration-300">
          <ScanForm />
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-slate-400 space-y-2">
          <p>✨ Powered by GPT-4o & Claude analysis</p>
          <p>🚀 Get results in under 2 minutes</p>
        </div>
      </div>
    </main>
  );
}
