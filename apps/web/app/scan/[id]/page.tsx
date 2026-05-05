'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { ScanResult, StatusResponse } from '@geo-analyzer/shared';

function LLMResultCard({ result }: { result: any; index: number }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const responsePreview = result.response.substring(0, 120) + (result.response.length > 120 ? '...' : '');
  const modelName = result.model.replace('openai/', '').replace('anthropic/', '').toUpperCase();

  return (
    <div className="group bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 cursor-pointer">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs font-bold text-indigo-700 uppercase bg-indigo-100 px-2.5 py-1 rounded-lg tracking-wider">
              {modelName}
            </span>
            {result.brandMentioned ? (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <span className="text-sm">✓</span> Mentioned
              </span>
            ) : (
              <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <span className="text-sm">✗</span> Not Mentioned
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-700 mb-2">{result.prompt}</p>
          <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">{responsePreview}</p>
          {result.competitorsMentioned.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Competitors</p>
              <div className="flex flex-wrap gap-1.5">
                {result.competitorsMentioned.slice(0, 3).map((comp: string, idx: number) => (
                  <span key={idx} className="text-xs font-medium bg-gradient-to-br from-blue-50 to-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 hover:border-indigo-400 transition">
                    {comp}
                  </span>
                ))}
                {result.competitorsMentioned.length > 3 && (
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">+{result.competitorsMentioned.length - 3}</span>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-indigo-600 transition-colors duration-200 mt-1 flex-shrink-0"
        >
          <svg className={`w-5 h-5 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">📋 Prompt</p>
            <p className="text-sm text-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200 leading-relaxed">{result.prompt}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase mb-2 tracking-wider">💬 Response</p>
            <p className="text-sm text-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono text-xs">{result.response}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const statusOrder = ['pending', 'crawling', 'querying', 'analyzing', 'complete', 'failed'] as const;

const statusLabels: Record<string, string> = {
  pending: 'Initializing...',
  crawling: 'Crawling website...',
  querying: 'Querying LLMs...',
  analyzing: 'Analyzing results...',
  complete: 'Complete',
  failed: 'Failed',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800',
  crawling: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
  querying: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
  analyzing: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
  complete: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
  failed: 'bg-gradient-to-r from-rose-500 to-rose-600 text-white',
};

export default function ScanResultsPage() {
  const params = useParams();
  const scanId = params.id as string;
  const [isComplete, setIsComplete] = useState(false);

  // Poll status endpoint every 2 seconds (stops when complete)
  const {
    data: statusData,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery<StatusResponse>({
    queryKey: ['scan-status', scanId],
    queryFn: async () => ky.get(`/api/scan/${scanId}/status`).json<StatusResponse>(),
    refetchInterval: isComplete ? false : 2000,
    enabled: !!scanId,
  });

  // Stop polling when complete
  useEffect(() => {
    if (statusData?.status === 'complete') {
      setIsComplete(true);
    }
  }, [statusData?.status]);

  // Fetch full results once complete
  const {
    data: resultsData,
    isLoading: resultsLoading,
    error: resultsError,
  } = useQuery<ScanResult>({
    queryKey: ['scan-results', scanId],
    queryFn: async () => ky.get(`/api/scan/${scanId}`).json<ScanResult>(),
    enabled: !!scanId && statusData?.status === 'complete',
    staleTime: Infinity,
  });

  const currentStatus = (statusData?.status || 'pending') as string;
  const currentIndex = statusOrder.indexOf(currentStatus as any);
  const progressPercent = ((currentIndex + 1) / statusOrder.length) * 100;

  if (statusError && statusError.toString().includes('404')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Scan Not Found</h1>
          <p className="text-gray-600 mt-2">This scan does not exist or has expired.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading scan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            {resultsData?.brandName || 'Scan Results'}
          </h1>
          <p className="text-slate-300 text-lg">{resultsData?.url || scanId}</p>
        </div>

        {/* Status Progress */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-white text-lg">Progress</h2>
              <span
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[currentStatus]} shadow-lg`}
              >
                {statusLabels[currentStatus]}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  currentStatus === 'failed' 
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600' 
                    : 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600'
                } shadow-lg`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Status steps */}
          <div className="grid grid-cols-6 gap-3">
            {statusOrder.map((status) => {
              const idx = statusOrder.indexOf(status);
              const isComplete = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              return (
                <div key={status} className="text-center">
                  <div
                    className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold transition-all duration-300 ${
                      isComplete
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg'
                        : isCurrent
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg ring-2 ring-indigo-300/50'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {isComplete ? '✓' : idx + 1}
                  </div>
                  <p className={`text-xs font-medium capitalize transition-colors duration-300 ${
                    isComplete || isCurrent ? 'text-white' : 'text-slate-400'
                  }`}>{status}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results */}
        {currentStatus === 'complete' && resultsLoading && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-12 text-center border border-white/20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-400 border-t-indigo-600"></div>
            <p className="text-white mt-6 font-medium">Loading results...</p>
          </div>
        )}

        {currentStatus === 'complete' && resultsData && (
          <div className="space-y-6">
            {/* Crawled Content */}
            {resultsData.crawledContent && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">🌐 Website Content</h2>
                <div className="space-y-4">
                  {resultsData.crawledContent.title && (
                    <div>
                      <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Title</p>
                      <p className="text-white font-medium bg-slate-700/50 p-3 rounded-lg border border-slate-600/50">{resultsData.crawledContent.title}</p>
                    </div>
                  )}
                  {resultsData.crawledContent.metaDescription && (
                    <div>
                      <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Meta Description</p>
                      <p className="text-slate-100 bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 leading-relaxed">{resultsData.crawledContent.metaDescription}</p>
                    </div>
                  )}
                  {resultsData.crawledContent.hasFAQSchema && (
                    <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 p-4 rounded-lg border border-emerald-400/50">
                      <p className="text-emerald-300 font-semibold">✓ FAQ Schema detected</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LLM Results Summary */}
            {resultsData.llmResults && resultsData.llmResults.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  🤖 LLM Analysis
                  <span className="text-base font-normal bg-indigo-500/30 px-3 py-1 rounded-lg text-indigo-200">{resultsData.llmResults.length} queries</span>
                </h2>
                <div className="mb-6 p-4 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl border border-indigo-400/50">
                  <p className="text-indigo-100 font-semibold text-lg">
                    <span className="text-2xl">📊</span> Brand mentioned in{' '}
                    <span className="text-indigo-300 font-bold text-xl">
                      {resultsData.llmResults.filter((r) => r.brandMentioned).length}/
                      {resultsData.llmResults.length}
                    </span>
                    {' '}responses
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resultsData.llmResults.map((result, idx) => (
                    <LLMResultCard key={idx} result={result} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {resultsData.recommendations && resultsData.recommendations.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  💡 Recommendations
                  <span className="text-base font-normal bg-orange-500/30 px-3 py-1 rounded-lg text-orange-200">{resultsData.recommendations.length} tips</span>
                </h2>
                <div className="space-y-3">
                  {resultsData.recommendations.map((rec, idx) => {
                    const typeEmojis: Record<string, string> = {
                      content: '✍️',
                      schema: '🔗',
                      authority: '⭐',
                      structure: '📐',
                    };
                    const typeColors: Record<string, string> = {
                      content: 'from-blue-500/20 to-cyan-500/20 border-blue-400/50',
                      schema: 'from-purple-500/20 to-pink-500/20 border-purple-400/50',
                      authority: 'from-orange-500/20 to-yellow-500/20 border-orange-400/50',
                      structure: 'from-green-500/20 to-emerald-500/20 border-green-400/50',
                    };
                    return (
                      <div key={idx} className={`bg-gradient-to-br ${typeColors[rec.type]} border rounded-xl p-5 hover:shadow-lg transition-all duration-300`}>
                        <div className="flex items-start gap-4">
                          <span className="text-2xl flex-shrink-0">
                            {typeEmojis[rec.type] || '💬'}
                          </span>
                          <div className="flex-1">
                            <h3 className="font-bold text-white text-lg">{rec.title}</h3>
                            <p className="text-slate-200 mt-1 leading-relaxed">{rec.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Done */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl shadow-2xl p-8 text-center border border-emerald-400/50 backdrop-blur-md">
              <p className="text-emerald-300 font-bold text-xl mb-2">✓ Analysis complete</p>
              <p className="text-emerald-200 text-sm mb-6">Your GEO optimization insights are ready</p>
              <a href="/" className="inline-block bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl">
                🔍 Start New Scan
              </a>
            </div>
          </div>
        )}

        {currentStatus === 'failed' && (
          <div className="bg-gradient-to-br from-rose-500/20 to-red-500/20 rounded-2xl shadow-2xl p-8 text-center border border-rose-400/50 backdrop-blur-md">
            <p className="text-rose-300 font-bold text-xl mb-2">✗ Scan failed</p>
            <p className="text-rose-200 text-sm mb-6">Something went wrong. Please try again.</p>
            <a href="/" className="inline-block bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl">
              🔄 Start Over
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
