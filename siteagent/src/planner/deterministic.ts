/**
 * deterministic.ts
 * Invariant: Sub-1ms deterministic regex mutator for zero-latency AST updates.
 */

export function mutateSiteMarkdown(markdown: string, mutations: {
  theme?: string;
  brand?: string;
  tagline?: string;
  replaceHeadline?: { oldText: string; newText: string };
}): string {
  let result = markdown;

  if (mutations.theme) {
    result = result.replace(/^style:\s*["']?[^"'\n]+["']?/m, `style: "${mutations.theme}"`);
  }

  if (mutations.brand) {
    result = result.replace(/^brand:\s*["']?[^"'\n]+["']?/m, `brand: "${mutations.brand}"`);
  }

  if (mutations.tagline) {
    result = result.replace(/^tagline:\s*["']?[^"'\n]+["']?/m, `tagline: "${mutations.tagline}"`);
  }

  if (mutations.replaceHeadline) {
    result = result.replace(mutations.replaceHeadline.oldText, mutations.replaceHeadline.newText);
  }

  return result;
}
