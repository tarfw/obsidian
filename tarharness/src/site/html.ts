/** Shared HTML helpers for the site compiler. */

export function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeAttribute(text: unknown): string {
  return escapeHtml(text).replace(/\n/g, ' ');
}

/** Allow only page paths, fragments, HTTPS, mailto and tel links. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f\\]/.test(href)) return null;
  if (href.startsWith('/') && !href.startsWith('//')) return escapeHtml(href);
  if (/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(href)) return escapeHtml(href);
  try {
    const parsed = new URL(href);
    if (['https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return escapeHtml(href);
  } catch { /* Relative and malformed links are not public navigation targets. */ }
  return null;
}

export function isSafeHref(value: unknown): boolean {
  return safeHref(value) !== null;
}

export function formatMoney(minorUnits: number, currency: string, locale: string): string {
  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    return formatter.format(minorUnits / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2));
  } catch { return ''; }
}

/** Deterministic lowercase path slug from free text. */
export function slugify(value: string, max = 60): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'item';
}
