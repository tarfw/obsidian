/**
 * Dispatcher mapping 70 section types to the 8 Engine Primitives.
 */

export * from './nav.ts';
export * from './hero.ts';
export * from './banner.ts';
export * from './collection.ts';
export * from './cards.ts';
export * from './accordion.ts';
export * from './media.ts';
export * from './action.ts';

import { renderNavPrimitive, type NavProps } from './nav.ts';
import { renderHeroPrimitive, type HeroProps } from './hero.ts';
import { renderBannerPrimitive, type BannerProps } from './banner.ts';
import { renderCollectionPrimitive, type CollectionProps } from './collection.ts';
import { renderCardsPrimitive, type CardsProps } from './cards.ts';
import { renderAccordionPrimitive, type AccordionProps } from './accordion.ts';
import { renderMediaPrimitive, type MediaProps } from './media.ts';
import { renderActionPrimitive, type ActionProps } from './action.ts';
import { getPatternById, type EnginePrimitiveKind } from '../patterns/catalog.ts';

export type AnyPrimitiveProps =
  | { primitive: 'nav'; props: NavProps }
  | { primitive: 'hero'; props: HeroProps }
  | { primitive: 'banner'; props: BannerProps }
  | { primitive: 'collection'; props: CollectionProps }
  | { primitive: 'cards'; props: CardsProps }
  | { primitive: 'accordion'; props: AccordionProps }
  | { primitive: 'media'; props: MediaProps }
  | { primitive: 'action'; props: ActionProps };

export function renderSectionByPatternId(patternId: number, config: unknown): string {
  const pattern = getPatternById(patternId);
  if (!pattern) return '';

  switch (pattern.primitive) {
    case 'nav':
      return renderNavPrimitive(config as NavProps);
    case 'hero':
      return renderHeroPrimitive(config as HeroProps);
    case 'banner':
      return renderBannerPrimitive(config as BannerProps);
    case 'collection':
      return renderCollectionPrimitive(config as CollectionProps);
    case 'cards':
      return renderCardsPrimitive(config as CardsProps);
    case 'accordion':
      return renderAccordionPrimitive(config as AccordionProps);
    case 'media':
      return renderMediaPrimitive(config as MediaProps);
    case 'action':
      return renderActionPrimitive(config as ActionProps);
    default:
      return '';
  }
}
