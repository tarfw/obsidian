import { badRequest, unavailable } from '../errors.ts';

export interface WebSource {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly date: string | null;
}

const text = (value: unknown, max: number): string => typeof value === 'string' ? value.trim().slice(0, max) : '';
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function searchWeb(key: string | undefined, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!key) throw unavailable('Web search is not configured.');
  const query = text(input.query, 500);
  if (!query) throw badRequest('Search query is required.');
  const location = text(input.location, 2).toUpperCase();
  const language = text(input.language, 10).toLowerCase();
  if (location && !/^[A-Z]{2}$/.test(location)) throw badRequest('Location must be a two-letter country code.');
  if (language && !/^[a-z]{2,10}$/.test(language)) throw badRequest('Language must be a language code.');

  const url = new URL('https://api.search.tinyfish.ai');
  url.searchParams.set('query', query);
  if (location) url.searchParams.set('location', location);
  if (language) url.searchParams.set('language', language);
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(8_000) });
  } catch {
    throw unavailable('Web search is temporarily unavailable.');
  }
  if (!response.ok) throw unavailable('Web search is temporarily unavailable.');
  const body = object(await response.json());
  const sources = Array.isArray(body.results) ? body.results.slice(0, 10).map(object).map((item): WebSource | null => {
    const url = text(item.url, 2_000);
    if (!url || !/^https?:\/\//.test(url)) return null;
    return { title: text(item.title, 300), url, snippet: text(item.snippet, 1_000), date: text(item.date, 40) || null };
  }).filter((item): item is WebSource => item !== null) : [];
  return { query, sources };
}
