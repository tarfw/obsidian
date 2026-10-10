import type { Section } from '../../document.ts';
import type { RenderContext } from '../nodes.ts';
import { renderShopifyFooter } from '../action.ts';

export function render(section: Section, context: RenderContext): string {
  const page = context.doc.pages[0] || { sections: [] };
  return renderShopifyFooter(context.doc, page as never, undefined, section.id || 'site-footer');
}
