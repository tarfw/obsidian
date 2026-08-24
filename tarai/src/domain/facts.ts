/**
 * TARAI FactSheet Slicing & Composite Hashing Engine
 */
import { computeSha256 } from './idempotency.ts';

export interface FactSlice {
  sliceId: string;
  category: 'offerings' | 'logistics' | 'faq' | 'testimonials' | 'branding';
  facts: Record<string, unknown>;
  version: number;
}

export interface RenderKeyInput {
  styleHash: string;
  sectionBriefHash: string;
  factSliceHash: string;
  compilerVersion: string;
  promptVersion: string;
}

export async function computeFactSliceHash(slice: FactSlice): Promise<string> {
  const content = JSON.stringify({
    sliceId: slice.sliceId,
    category: slice.category,
    facts: slice.facts,
    version: slice.version,
  });
  return computeSha256(content);
}

export async function computeRenderKey(input: RenderKeyInput): Promise<string> {
  const raw = `${input.styleHash}:${input.sectionBriefHash}:${input.factSliceHash}:${input.compilerVersion}:${input.promptVersion}`;
  return computeSha256(raw);
}

/**
 * Extracts facts needed for a specific module or site section slice
 */
export function extractFactSlice(
  allFacts: Record<string, unknown>,
  category: FactSlice['category']
): FactSlice {
  const subset: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(allFacts)) {
    if (key.startsWith(`${category}.`) || key === category) {
      subset[key] = value;
    }
  }
  return {
    sliceId: `slice_${category}`,
    category,
    facts: subset,
    version: 1,
  };
}
