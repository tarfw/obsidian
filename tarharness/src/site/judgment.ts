import { THEME_NAMES, type ThemeName } from './schema.ts';

const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Aesthetic advice only. Site facts, policy, and publishing remain deterministic. */
export async function chooseSiteTheme(apiKey: string | undefined, title: string, instruction: string): Promise<ThemeName | null> {
  if (!apiKey || !instruction) return null;
  try {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'jev-latest',
        state: { title, instruction },
        questions: {
          theme: {
            type: 'choice',
            instructions: 'Which visual theme best fits the supplied business description? Choose from the provided themes only. This choice does not assert any business fact.',
            criteria: {
              'editorial-chalk': 'Warm editorial visual identity for descriptive storytelling.',
              'streetwear-dark': 'Bold, high-contrast visual identity for expressive brands.',
              'minimal-clean': 'Neutral, restrained visual identity for a broad range of businesses.',
            },
          },
        },
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const payload = object(await response.json());
    const answer = object(object(payload.answers).theme);
    const selected = answer.choice;
    return typeof selected === 'string' && THEME_NAMES.includes(selected as ThemeName) ? selected as ThemeName : null;
  } catch { return null; }
}
