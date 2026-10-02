/**
 * Site document reader.
 *
 * A stored record is read as the current v2 document model and auto-healed for
 * route gaps: any navigation target that is not yet a page becomes one. There
 * is no legacy shape and no migration path — anything that is not a v2 document
 * is rejected.
 */

import { badRequest } from '../errors.ts';
import { DOCUMENT_VERSION, type Node, type Page, type SiteDocument } from './document.ts';

export function isV2(source: unknown): source is SiteDocument {
  return Boolean(source) && (source as SiteDocument).schema === DOCUMENT_VERSION;
}

function walkNodes(nodes: Node[] | undefined): Node[] {
  return (nodes || []).flatMap((node) => [node, ...walkNodes(node.children)]);
}

export function normalizeDocument(doc: SiteDocument): SiteDocument {
  const brand = doc.pages[0]?.title || doc.brief?.goal?.slice(0, 40) || 'Storefront';
  const pages = doc.pages;

  const existingPaths = new Set(pages.map((p) => p.path));
  const existingRedirects = new Set(doc.redirects.map((r) => r.from));
  const missingPaths: string[] = [];

  const allNodes = pages.flatMap((page) => page.sections.flatMap((section) => walkNodes(section.nodes)));
  for (const node of allNodes) {
    if (node.kind === 'link' || node.kind === 'button') {
      const href = typeof node.props?.href === 'string' ? node.props.href : '';
      if (href.startsWith('/') && !existingPaths.has(href) && !existingRedirects.has(href) && !href.startsWith('/#')) {
        if (!missingPaths.includes(href)) missingPaths.push(href);
      }
    }
    const links = node.kind === 'navigation' || node.kind === 'footer' || node.kind === 'menu' ? node.props?.links : undefined;
    if (Array.isArray(links)) {
      for (const link of links as { href?: string }[]) {
        const href = typeof link.href === 'string' ? link.href : '';
        if (href.startsWith('/') && !existingPaths.has(href) && !existingRedirects.has(href) && !href.startsWith('/#')) {
          if (!missingPaths.includes(href)) missingPaths.push(href);
        }
      }
    }
  }

  if (!missingPaths.length) return { ...doc, pages };

  const navLinks = pages.map((p) => ({ label: p.path === '/' ? 'Home' : p.path.slice(1), href: p.path }));

  const synthesizedPages: Page[] = missingPaths.map((path) => {
    const rawSlug = path.replace(/^\/+/, '').replace(/[^a-z0-9-]/gi, '-');
    const id = rawSlug || 'page';
    const title = id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
    return {
      id,
      path,
      title,
      meta: { description: `${title} — ${brand}` },
      sections: [
        {
          id: `${id}-bar`,
          purpose: 'chrome',
          layout: { kind: 'stack' },
          style: { base: { pad: 'token:space.unit' } },
          nodes: [{ id: `${id}-nav`, kind: 'navigation', props: { brand, links: navLinks } }],
        },
        {
          id: `${id}-intro`,
          purpose: 'introduction',
          layout: { kind: 'stack' },
          style: { base: { pad: 'token:space.section' } },
          nodes: [
            { id: `${id}-title`, kind: 'heading', props: { text: title, level: 1 } },
            { id: `${id}-body`, kind: 'text', props: { text: `${brand} ${title}` } },
          ],
        },
        {
          id: `${id}-foot`,
          purpose: 'chrome',
          layout: { kind: 'stack' },
          style: { base: { pad: 'token:space.unit' } },
          nodes: [{ id: `${id}-end`, kind: 'footer', props: { brand, text: `© ${new Date().getFullYear()} ${brand}`, links: [] } }],
        },
      ],
    };
  });

  return {
    ...doc,
    pages: [...doc.pages, ...synthesizedPages],
  };
}

/** Read a stored site record as a current document, auto-healing route gaps. */
export function readDocument(value: unknown): { doc: SiteDocument } {
  if (isV2(value)) return { doc: normalizeDocument(value) };
  throw badRequest('Site definition is invalid.');
}
