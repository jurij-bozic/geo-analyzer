import { openrouter, MODELS } from './openrouter';

export async function inferNiche(title: string, metaDescription: string): Promise<string> {
  try {
    // Sanitize inputs to prevent injection
    const sanitizedTitle = title.replace(/[\n\r]/g, ' ').substring(0, 200);
    const sanitizedDescription = metaDescription.replace(/[\n\r]/g, ' ').substring(0, 300);

    const prompt = `You are a niche classification system. Analyze this page title and description, then respond with ONLY a single lowercase word (2-15 characters) that describes the primary industry or niche. Do not include explanations, articles, or punctuation.

Title: ${sanitizedTitle}
Description: ${sanitizedDescription}

Respond with only ONE word:`;

    const response = await openrouter.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      max_tokens: 5,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    let niche = response.choices[0]?.message?.content?.trim() || 'technology';
    
    // Validate that niche is a single word (letters only, 2-15 chars)
    const isValidNiche = /^[a-z]{2,15}$/.test(niche.toLowerCase());
    
    if (!isValidNiche) {
      console.warn(`Invalid niche returned: "${niche}", falling back to "technology"`);
      niche = 'technology';
    }
    
    return niche.toLowerCase();
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
