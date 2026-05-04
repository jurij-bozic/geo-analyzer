'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { ScanResult, StatusResponse } from '@geo-analyzer/shared';

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
  pending: 'bg-gray-200',
  crawling: 'bg-blue-200',
  querying: 'bg-purple-200',
  analyzing: 'bg-orange-200',
  complete: 'bg-green-200',
  failed: 'bg-red-200',
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {resultsData?.brandName || 'Scan Results'}
          </h1>
          <p className="text-gray-600">{resultsData?.url || scanId}</p>
        </div>

        {/* Status Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-900">Progress</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[currentStatus]}`}
              >
                {statusLabels[currentStatus]}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentStatus === 'failed' ? 'bg-red-600' : 'bg-green-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Status steps */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            {['pending', 'crawling', 'querying'].map((status) => (
              <div key={status} className="text-center">
                <div
                  className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${
                    currentIndex >= statusOrder.indexOf(status as any)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentIndex > statusOrder.indexOf(status as any) ? '✓' : ''}
                </div>
                <p className="text-gray-600 capitalize">{status}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm mt-4">
            {['analyzing', 'complete'].map((status) => (
              <div key={status} className="text-center">
                <div
                  className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${
                    currentIndex >= statusOrder.indexOf(status as any)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentIndex > statusOrder.indexOf(status as any) ? '✓' : ''}
                </div>
                <p className="text-gray-600 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {currentStatus === 'complete' && resultsLoading && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading results...</p>
          </div>
        )}

        {currentStatus === 'complete' && resultsData && (
          <div className="space-y-6">
            {/* Crawled Content */}
            {resultsData.crawledContent && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Website Content</h2>
                <div className="space-y-3 text-sm">
                  {resultsData.crawledContent.title && (
                    <div>
                      <p className="text-gray-600">Title</p>
                      <p className="text-gray-900 font-medium">{resultsData.crawledContent.title}</p>
                    </div>
                  )}
                  {resultsData.crawledContent.metaDescription && (
                    <div>
                      <p className="text-gray-600">Meta Description</p>
                      <p className="text-gray-900">{resultsData.crawledContent.metaDescription}</p>
                    </div>
                  )}
                  {resultsData.crawledContent.hasFAQSchema && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-blue-900">✓ FAQ Schema detected</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LLM Results Summary */}
            {resultsData.llmResults && resultsData.llmResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  LLM Analysis ({resultsData.llmResults.length} queries)
                </h2>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    Brand mentioned in:{' '}
                    <span className="font-semibold text-gray-900">
                      {resultsData.llmResults.filter((r) => r.brandMentioned).length}/
                      {resultsData.llmResults.length}
                    </span>
                  </p>
                  {resultsData.llmResults.some((r) => r.competitorsMentioned?.length) && (
                    <p className="text-gray-600">
                      Competitors mentioned: See details below
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {resultsData.recommendations && resultsData.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Recommendations ({resultsData.recommendations.length})
                </h2>
                <div className="space-y-3">
                  {resultsData.recommendations.map((rec, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded">
                          {rec.type}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Done */}
            <div className="bg-green-50 rounded-lg shadow-sm p-6 text-center border border-green-200">
              <p className="text-green-900 font-medium">✓ Analysis complete</p>
              <a href="/" className="text-blue-600 hover:underline mt-3 inline-block">
                Start New Scan
              </a>
            </div>
          </div>
        )}

        {currentStatus === 'failed' && (
          <div className="bg-red-50 rounded-lg shadow-sm p-6 text-center border border-red-200">
            <p className="text-red-900 font-medium">✗ Scan failed</p>
            <a href="/" className="text-blue-600 hover:underline mt-3 inline-block">
              Start Over
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
