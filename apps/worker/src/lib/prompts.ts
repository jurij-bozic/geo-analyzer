import { openrouter, MODELS } from './openrouter';

export async function inferNiche(title: string, metaDescription: string): Promise<string> {
  try {
    const prompt = `Based on this page title and description, return a single word describing the industry or niche. Return only the word, nothing else.

Title: ${title}
Description: ${metaDescription}`;

    const response = await openrouter.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const niche = response.choices[0]?.message?.content?.trim() || 'technology';
    return niche || 'technology';
  } catch (error) {
    console.error('Error inferring niche:', error);
    return 'technology'; // Fallback niche
  }
}

export async function getPrompts(brandName: string, niche: string): Promise<string[]> {
  return [
    `What are the best tools for ${niche} in 2026?`,
    `I'm looking for a ${niche} platform for my business. What do you recommend?`,
    `What software do experts use for ${niche} automation?`,
    `Compare the top ${niche} tools available today.`,
    `What ${niche} tools are worth paying for?`,
    `Is ${brandName} a good tool for ${niche}?`,
    `What alternatives are there to ${brandName} for ${niche}?`,
  ];
}
