import OpenAI from 'openai';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
  es: 'Spanish',
};

interface TranslationInput {
  name: string;
  description?: string;
  cultural_note?: string;
}

interface TranslationOutput {
  name: string;
  description?: string;
  cultural_note?: string;
}

export async function translateMenu(
  source: TranslationInput,
  fromLang: string,
  toLang: string,
): Promise<TranslationOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const fromName = LANGUAGE_NAMES[fromLang] || fromLang;
  const toName = LANGUAGE_NAMES[toLang] || toLang;

  const fields: { key: string; value: string }[] = [
    { key: 'name', value: source.name },
  ];
  if (source.description) {
    fields.push({ key: 'description', value: source.description });
  }
  if (source.cultural_note) {
    fields.push({ key: 'cultural_note', value: source.cultural_note });
  }

  const fieldLines = fields
    .map((f) => `  "${f.key}": "${f.value}"`)
    .join(',\n');

  const prompt = `You are a professional restaurant menu translator.
Translate the following menu item fields from ${fromName} to ${toName}.
Keep the translation natural and appetizing for restaurant customers.
For the cultural_note field, explain any cultural context that would help a ${toName}-speaking customer understand the dish.

Input JSON:
{
${fieldLines}
}

Return ONLY a valid JSON object with the same keys, translated to ${toName}. No markdown, no explanation.`;

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No translation returned from AI');
  }

  // Parse JSON - strip markdown code fences if present
  const jsonStr = content.replace(/^```json?\s*\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(jsonStr) as TranslationOutput;

  if (!parsed.name) {
    throw new Error('Translation missing required name field');
  }

  return {
    name: parsed.name,
    description: parsed.description || undefined,
    cultural_note: parsed.cultural_note || undefined,
  };
}
