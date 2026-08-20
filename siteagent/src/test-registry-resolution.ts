import { REFERO_STYLES_REGISTRY } from './styles/registry';
import { parseDesignMarkdown } from './parser/designmd-parser';
import { resolveTokens } from './styles/tokens';
import { generateFontLinks } from './styles/typography';

console.log('Testing design system resolution across all registry items...');

for (const [key, markdown] of Object.entries(REFERO_STYLES_REGISTRY)) {
  const tokens = parseDesignMarkdown(markdown);
  const resolved = resolveTokens(tokens);
  const fontLinks = generateFontLinks(tokens);
  
  console.log(`Key: ${key.padEnd(20)} | Title: "${tokens.name.padEnd(20)}" | Heading Font: ${resolved.fontHeading.padEnd(30)} | Primary Color: ${resolved.primary}`);
}
