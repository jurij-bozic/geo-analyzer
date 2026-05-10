import { PrismaClient } from '@prisma/client';
import { openrouter, MODELS } from '../lib/openrouter';

const prisma = new PrismaClient();

interface RecommendationResponse {
  type: 'content' | 'schema' | 'authority' | 'structure';
  title: string;
  description: string;
}

export async function recommendationJob(scanId: string): Promise<void> {
  try {
    // Fetch the scan and all LLM results
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { llmResults: true },
    });

    if (!scan) {
      throw new Error(`Scan ${scanId} not found`);
    }

    // Count how many results mentioned the brand
    const mentionCount = scan.llmResults.filter((r) => r.brandMentioned).length;

    // Aggregate competitor mentions
    const competitorCounts: Record<string, number> = {};
    scan.llmResults.forEach((result) => {
      result.competitorsMentioned.forEach((competitor: string) => {
        competitorCounts[competitor] = (competitorCounts[competitor] || 0) + 1;
      });
    });

    // Get top 5 competitors
    const topCompetitors = Object.entries(competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)
      .join(', ');

    // Build the recommendation prompt
    const prompt = `You are a GEO (Generative Engine Optimization) expert.

A brand called "${scan.brandName}" was mentioned in ${mentionCount} out of 14 LLM responses.

The following competitors were mentioned more frequently: ${topCompetitors || 'none'}.

Here is the brand's current website content summary:
- Title: ${scan.crawledTitle}
- Meta description: ${scan.crawledMeta}
- Headings: ${scan.crawledHeadings.join(', ')}
- Has FAQ schema: ${scan.hasFAQSchema}
- Body text excerpt: ${scan.crawledBody?.substring(0, 500)}

Generate exactly 5 specific, actionable recommendations to improve this brand's visibility in LLM responses. For each recommendation, return:
- type: one of "content", "schema", "authority", "structure"
- title: short title (max 8 words)
- description: detailed explanation (2-4 sentences)

Return as a JSON array and nothing else.`;

    // Call GPT-4o to generate recommendations
    const response = await openrouter.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = response.choices[0]?.message?.content || '[]';

    // Parse recommendations
    let recommendations: RecommendationResponse[] = [];
    try {
      recommendations = JSON.parse(responseText);
    } catch (e) {
      console.error('Error parsing recommendations:', e);
      recommendations = [];
    }

    // Save recommendations to database
    for (const rec of recommendations) {
      await prisma.recommendation.create({
        data: {
          scanId,
          type: rec.type,
          title: rec.title,
          description: rec.description,
        },
      });
    }
  } catch (error) {
    console.error('Recommendation job error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
