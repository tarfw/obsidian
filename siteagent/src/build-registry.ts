import * as fs from 'fs';
import * as path from 'path';

const designMdsDir = path.resolve('..', 'designmds');
const files = fs.readdirSync(designMdsDir).filter(f => f.endsWith('.md'));

let out = `/**
 * registry.ts
 * Embedded Registry of all 25 Ground-Truth Refero Extended Design Markdown Specifications.
 */

export const REFERO_STYLES_REGISTRY: Record<string, string> = {
`;

for (const file of files) {
  const content = fs.readFileSync(path.join(designMdsDir, file), 'utf-8');
  out += `  ${JSON.stringify(file)}: ${JSON.stringify(content)},\n`;
  // Also add key without .md extension
  const baseKey = file.replace(/\.md$/, '');
  out += `  ${JSON.stringify(baseKey)}: ${JSON.stringify(content)},\n`;
}

out += `};

export function getReferoDesignMarkdown(styleName?: string): string {
  if (!styleName) return REFERO_STYLES_REGISTRY['eathungrytiger.md'];
  const clean = styleName.trim().toLowerCase();
  return REFERO_STYLES_REGISTRY[clean] || 
         REFERO_STYLES_REGISTRY[\`\${clean}.md\`] || 
         REFERO_STYLES_REGISTRY['eathungrytiger.md'];
}
`;

fs.writeFileSync(path.resolve('src', 'styles', 'registry.ts'), out, 'utf-8');
console.log(`Generated src/styles/registry.ts with ${files.length} full Refero styles!`);
