import type { Section } from '../../document.ts';
import { renderNodes, type RenderContext } from '../nodes.ts';
import { renderDefaultCatalogSection } from '../collection.ts';

export function render(section: Section, context: RenderContext): string {
  const body = renderNodes(section.nodes, { ...context, binding: section.bindings?.[0], sectionLayout: section.layout });
  if (body.trim()) {
    const layout = section.layout || { kind: 'grid' };
    const columns = typeof layout.columns === 'number' ? ` style="grid-template-columns:repeat(${layout.columns}, minmax(0, 1fr))"` : '';
    return `<section id="${section.id || 'catalog'}" class="tar-section" data-purpose="catalog">
  <div class="tar-wrap tar-grid"${columns}>
    ${body}
  </div>
</section>`;
  }

  return renderDefaultCatalogSection(context.doc);
}
