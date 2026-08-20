/**
 * planner.ts
 * Invariant: Hybrid deterministic + LLM surgical layout planner.
 */

import { mutateSiteMarkdown } from './deterministic';

export interface PlannerRequest {
  currentSiteMarkdown: string;
  instruction: string;
  themeOverride?: string;
}

export async function processPlannerRequest(req: PlannerRequest, _apiKey?: string): Promise<string> {
  const { currentSiteMarkdown, instruction, themeOverride } = req;

  // 1. Check for fast deterministic matches (theme switches, quick swaps)
  if (themeOverride) {
    return mutateSiteMarkdown(currentSiteMarkdown, { theme: themeOverride });
  }

  // 2. Simple keyword rules
  if (instruction.toLowerCase().includes('change theme to') || instruction.toLowerCase().includes('switch style to')) {
    const match = instruction.match(/(?:change theme to|switch style to)\s+([a-zA-Z0-9_\-\.]+)/i);
    if (match && match[1]) {
      const newStyle = match[1].endsWith('.md') ? match[1] : `${match[1]}.md`;
      return mutateSiteMarkdown(currentSiteMarkdown, { theme: newStyle });
    }
  }

  // Return mutated or current markdown
  return currentSiteMarkdown;
}
