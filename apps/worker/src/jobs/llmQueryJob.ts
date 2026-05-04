import { PrismaClient } from '@prisma/client';
import { openrouter, MODELS } from '../lib/openrouter';
import { getPrompts, inferNiche } from '../lib/prompts';

const prisma = new PrismaClient();

export async function llmQueryJob(scanId: string): Promise<void> {
  try {
    // Fetch the scan and crawled content
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new Error(`Scan ${scanId} not found`);
    }

    // Infer niche from title and meta description
    const niche = await inferNiche(
      scan.crawledTitle || '',
      scan.crawledMeta || ''
    );

    // Get prompts
    const prompts = await getPrompts(scan.brandName, niche);

    // Prepare LLM calls - 7 prompts × 2 models = 14 calls
    const llmCalls = prompts.flatMap((prompt) =>
      [MODELS.GPT4O, MODELS.CLAUDE_SONNET].map(async (model) => {
        try {
          // Query LLM
          const response = await openrouter.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant. Answer the user\'s question honestly and helpfully. Mention specific tools and products where relevant.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          });

          const responseText = response.choices[0]?.message?.content || '';

          // Check if brand name is mentioned (case-insensitive)
          const brandMentioned = responseText.toLowerCase().includes(scan.brandName.toLowerCase());

          // Extract competitor names
          let competitorsMentioned: string[] = [];
          try {
            const extractResponse = await openrouter.chat.completions.create({
              model: MODELS.GPT4O_MINI,
              messages: [
                {
                  role: 'user',
                  content: `List all product names, brand names, and tool names mentioned in the following text. Return as a JSON array of strings and nothing else.\n\n${responseText}`,
                },
              ],
            });

            const extractedText = extractResponse.choices[0]?.message?.content || '[]';
            competitorsMentioned = JSON.parse(extractedText);
          } catch (e) {
            console.error('Error parsing competitors:', e);
            competitorsMentioned = [];
          }

          // Save LLM result
          await prisma.lLMResult.create({
            data: {
              scanId,
              model,
              prompt,
              response: responseText,
              brandMentioned,
              competitorsMentioned,
            },
          });
        } catch (error) {
          console.error(`Error calling ${model}:`, error);
          // Don't rethrow - continue with other calls
        }
      })
    );

    // Execute all LLM calls in parallel
    await Promise.all(llmCalls);
  } catch (error) {
    console.error('LLM query job error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
