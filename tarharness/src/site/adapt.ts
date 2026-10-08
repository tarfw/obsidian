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
          id: `${id}-hero`,
          purpose: 'header',
          layout: { kind: 'stack' },
          style: { base: { pad: 'token:space.section' } },
          nodes: [
            { id: `${id}-title`, kind: 'heading', props: { text: title, level: 1 } },
            { id: `${id}-body`, kind: 'text', props: { text: `${brand} ${title}` } },
          ],
        },
        {
          id: `${id}-contact`,
          purpose: 'contact',
          layout: { kind: 'stack' },
          style: { base: { pad: 'token:space.unit' } },
          nodes: [{ id: `${id}-end`, kind: 'button', props: { label: 'Chat on WhatsApp', href: 'https://wa.me/', variant: 'filled' } }],
        },
      ],
    };
  });

  const allPages = [...doc.pages, ...synthesizedPages];

  // Purge legacy sections (chrome, categories, recommendations, press, etc.)
  const cleanPages: Page[] = allPages.map((page) => {
    const cleanSections = page.sections.flatMap((s) => {
      if (s.purpose === 'chrome' || s.purpose === 'categories' || s.purpose === 'recommendations' || s.purpose === 'press') {
        return [];
      }
      if (s.purpose === 'introduction') {
        return [{ ...s, id: 'hero', purpose: 'header' }];
      }
      if (s.purpose === 'collection') {
        return [{ ...s, purpose: 'catalog' }];
      }
      if (s.purpose === 'promo') {
        return [{ ...s, purpose: 'spotlight' }];
      }
      if (s.purpose === 'action') {
        return [{ ...s, purpose: 'contact' }];
      }
      return [s];
    });

    // Ensure header and contact exist
    const hasHeader = cleanSections.some((s) => s.purpose === 'header' || s.id === 'hero');
    if (!hasHeader) {
      cleanSections.unshift({
        id: 'hero',
        purpose: 'header',
        layout: { kind: 'stack' },
        style: { base: { pad: 'md' } },
        nodes: [{ id: 'hero-title', kind: 'heading', props: { text: brand, level: 1 } }],
      });
    }
    const hasCatalog = cleanSections.some((s) => s.purpose === 'catalog' || s.purpose === 'collection' || s.purpose === 'menu' || s.purpose === 'services' || s.id === 'catalog');
    if (!hasCatalog) {
      cleanSections.push({
        id: 'catalog',
        purpose: 'catalog',
        layout: { kind: 'grid', columns: 3 },
        style: { base: { pad: 'md' } },
        nodes: [{
          id: 'catalog-items',
          kind: 'collection',
          props: {
            title: 'Catalog',
            slot: 'items',
            items: [],
          },
        }],
      });
    }
    const hasContact = cleanSections.some((s) => s.purpose === 'contact');
    if (!hasContact) {
      cleanSections.push({
        id: 'contact',
        purpose: 'contact',
        layout: { kind: 'stack' },
        style: { base: { pad: 'md' } },
        nodes: [{ id: 'contact-btn', kind: 'button', props: { label: 'Chat on WhatsApp', href: 'https://wa.me/', variant: 'filled' } }],
      });
    }

    return { ...page, sections: cleanSections };
  });

  return {
    ...doc,
    pages: cleanPages,
  };
}

/** Read a stored site record as a current document, auto-healing route gaps. */
export function readDocument(value: unknown): { doc: SiteDocument } {
  if (isV2(value)) return { doc: normalizeDocument(value) };
  throw badRequest('Site definition is invalid.');
}
