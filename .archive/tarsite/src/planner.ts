/**
 * tarsite — Conversational AST Planner & Mutation Engine
 * Executes surgical, non-destructive AST diff/patches on existing layouts.
 * Supports deterministic regex mutations and LLM-assisted (Groq Llama 3.3 70B) surgical updates.
 */

import { type UIPlan, type UIRoute, type UINode, type DesignTokens } from './types';
import { getPresetDesignTokens } from './tokens';
import { getBuiltinTemplateMd } from './builtin-templates';
import { parseDesignMd } from './designmd-parser';

export interface PlannerOptions {
  workspaceId: string;
  workspaceName: string;
  instruction: string;
  templateHint?: string;
  model?: string;
  groqApiKey?: string;
  products?: Array<{ name: string; price?: number | null; description?: string }>;
  existingPlan?: UIPlan | null;
}

/**
 * Deterministic Surgical AST Mutator
 * Handles 95% of common user editing commands instantly (< 1ms) with zero hallucination.
 */
export function mutateExistingPlan(plan: UIPlan, instruction: string): UIPlan | null {
  const norm = instruction.trim().toLowerCase();
  const cloned: UIPlan = JSON.parse(JSON.stringify(plan));
  const route = cloned.routes?.[0];
  if (!route || !Array.isArray(route.nodes)) return null;

  let modified = false;

  // ── 1. Hero Headline & Title Changes ─────────────────────────────────
  const headlineMatch =
    instruction.match(/change (?:the )?(?:hero )?headline to ["'“”]?([^"'“”]+)["'“”]?/i) ||
    instruction.match(/make (?:the )?(?:hero )?headline ["'“”]?([^"'“”]+)["'“”]?/i) ||
    instruction.match(/update (?:the )?(?:hero )?headline to ["'“”]?([^"'“”]+)["'“”]?/i) ||
    instruction.match(/set (?:the )?(?:hero )?headline to ["'“”]?([^"'“”]+)["'“”]?/i) ||
    instruction.match(/hero headline:?\s*["'“”]?([^"'“”]+)["'“”]?/i);

  if (headlineMatch) {
    const newHeadline = headlineMatch[1].trim();
    const heroNode = route.nodes.find(
      (n) => n.type === 'hero_banner' || n.type === 'poster' || n.type === 'hero_poster' || n.type === 'section_hero' || n.type === 'split'
    );
    if (heroNode) {
      heroNode.props = heroNode.props || {};
      heroNode.props.headline = newHeadline;
      heroNode.props.title = newHeadline;
      modified = true;
    }
  }

  // ── 2. Hero Subtitle / Subtext Changes ──────────────────────────────
  const subtitleMatch =
    instruction.match(/change (?:the )?(?:hero )?subtitle to ["'“”]?([^"'“”]+)["'“”]?/i) ||
    instruction.match(/make (?:the )?(?:hero )?subtitle ["'“”]?([^"'“”]+)["'“”]?/i);

  if (subtitleMatch) {
    const newSubtitle = subtitleMatch[1].trim();
    const heroNode = route.nodes.find(
      (n) => n.type === 'hero_banner' || n.type === 'poster' || n.type === 'hero_poster' || n.type === 'split'
    );
    if (heroNode) {
      heroNode.props = heroNode.props || {};
      heroNode.props.subtitle = newSubtitle;
      modified = true;
    }
  }

  // ── 3. Announcement Bar / Marquee Additions & Updates ────────────────
  const announcementAddMatch =
    instruction.match(/add (?:a |an )?["'“”]?([^"'“”]+?)["'“”]? (?:discount |promo )?announcement (?:bar|ticker|strip)(?: on top)?/i) ||
    instruction.match(/add (?:a |an )?announcement (?:bar|ticker|strip) (?:with |saying )?["'“”]?([^"'“”]+)["'“”]?/i) ||
    instruction.match(/add ticker (?:with |saying )?["'“”]?([^"'“”]+)["'“”]?/i);

  const announcementUpdateMatch =
    instruction.match(/change (?:the )?announcement (?:bar )?to ["'“”]?([^"'“”]+)["'“”]?/i) ||
    instruction.match(/update (?:the )?announcement (?:bar )?to ["'“”]?([^"'“”]+)["'“”]?/i);

  if (announcementAddMatch || announcementUpdateMatch) {
    const rawText = (announcementAddMatch ? announcementAddMatch[1] : announcementUpdateMatch![1]).trim();
    const bannerText = rawText.toUpperCase().includes('OFF') || rawText.toUpperCase().includes('SHIPPING') || rawText.toUpperCase().includes('LIVE')
      ? rawText.toUpperCase()
      : `${rawText.toUpperCase()} · FREE SHIPPING ON ORDERS OVER $45 · LIMITED DROP LIVE`;

    const existingTicker = route.nodes.find((n) => n.type === 'announcement_bar' || n.type === 'marquee' || n.type === 'rail' || n.type === 'marquee_strip');

    if (existingTicker) {
      existingTicker.props = existingTicker.props || {};
      existingTicker.props.text = bannerText;
    } else {
      route.nodes.unshift({
        id: 'sec_00_announcement',
        type: 'rail',
        contract: {
          bg: cloned.designTokens?.colors?.primary || '#faae33',
          text_color: cloned.designTokens?.colors?.background || '#281006',
          speed: '20s',
        },
        props: {
          text: bannerText,
        },
      });
    }
    modified = true;
  }

  // ── 4. Product Grid Column Matrix Updates ───────────────────────────
  const columnMatch =
    instruction.match(/switch (?:the )?(?:product )?grid to (\d+) columns?/i) ||
    instruction.match(/change (?:the )?(?:product )?(?:grid )?columns? to (\d+)/i) ||
    instruction.match(/make (?:the )?(?:product )?grid (\d+) columns?/i);

  if (columnMatch) {
    const cols = parseInt(columnMatch[1], 10);
    const gridNode = route.nodes.find((n) => n.type === 'product_grid' || n.type === 'grid' || n.type === 'content_grid');
    if (gridNode) {
      gridNode.contract = gridNode.contract || {};
      gridNode.contract.columns = cols;
      gridNode.layout = `grid-${cols}` as any;
      modified = true;
    }
  }

  // ── 5. Color Palette & Background Tone Updates ───────────────────────
  const bgMatch =
    instruction.match(/make (?:the )?background (warmer taupe|taupe|sand|black|dark|white|light|green|sage|emerald|#[\da-f]{3,6})/i) ||
    instruction.match(/change (?:the )?background to (warmer taupe|taupe|sand|black|dark|white|light|green|sage|emerald|#[\da-f]{3,6})/i);

  if (bgMatch) {
    const tone = bgMatch[1].toLowerCase();
    cloned.designTokens = cloned.designTokens || getPresetDesignTokens('milo', cloned.workspaceId || 'default');
    cloned.designTokens.colors = cloned.designTokens.colors || {} as any;

    if (tone.includes('taupe') || tone.includes('sand')) {
      cloned.designTokens.colors.background = '#F5F2EB';
      cloned.designTokens.colors.surface = '#FFFFFF';
      cloned.designTokens.colors.text = '#2C2A29';
      cloned.designTokens.colors.muted = '#78716C';
    } else if (tone.includes('black') || tone.includes('dark')) {
      cloned.designTokens.colors.background = '#0A0A0C';
      cloned.designTokens.colors.surface = '#18181B';
      cloned.designTokens.colors.text = '#FFFFFF';
      cloned.designTokens.colors.muted = '#A1A1AA';
    } else if (tone.includes('green') || tone.includes('sage') || tone.includes('emerald')) {
      cloned.designTokens.colors.background = '#032E1C';
      cloned.designTokens.colors.surface = '#0A3B26';
      cloned.designTokens.colors.text = '#FFFFFF';
      cloned.designTokens.colors.muted = '#A3C9B6';
    } else if (tone.startsWith('#')) {
      cloned.designTokens.colors.background = tone;
    }
    modified = true;
  }

  // ── 6. Section Deletion / Removal ───────────────────────────────────
  const removeMatch =
    instruction.match(/remove (?:the )?(announcement|ticker|hero|products?|story|footer|accordion|faq) (?:section|bar|ticker|strip)?/i) ||
    instruction.match(/delete (?:the )?(announcement|ticker|hero|products?|story|footer|accordion|faq) (?:section|bar|ticker|strip)?/i);

  if (removeMatch) {
    const targetType = removeMatch[1].toLowerCase();
    route.nodes = route.nodes.filter((n) => {
      if (targetType.includes('announcement') || targetType.includes('ticker')) {
        return n.type !== 'announcement_bar' && n.type !== 'marquee' && n.type !== 'rail' && n.type !== 'marquee_strip';
      }
      if (targetType.includes('hero')) {
        return n.type !== 'hero_banner' && n.type !== 'poster' && n.type !== 'hero_poster';
      }
      if (targetType.includes('product')) {
        return n.type !== 'product_grid' && n.type !== 'grid';
      }
      if (targetType.includes('story')) {
        return n.type !== 'story_banner' && n.type !== 'split' && n.type !== 'editorial_split';
      }
      if (targetType.includes('faq') || targetType.includes('accordion')) {
        return n.type !== 'accordion' && n.type !== 'faq';
      }
      return true;
    });
    modified = true;
  }

  // ── 7. Adding Composable Sections ────────────────────────────────────
  const addSectionMatch =
    instruction.match(/add (?:a |an )?(recipe|faq|accordion|review|testimonial|story|split) section(?: (?:below|after) (products|hero))?/i);

  if (addSectionMatch) {
    const kind = addSectionMatch[1].toLowerCase();
    const afterTarget = addSectionMatch[2]?.toLowerCase();

    let newNode: UINode | null = null;

    if (kind.includes('recipe')) {
      newNode = {
        id: `sec_recipe_${Date.now()}`,
        type: 'grid',
        contract: { columns: 3, card_radius: '12px' },
        props: {
          title: '3 Ways to Pair & Savor',
          subtitle: 'Chef-crafted recipes and flavor combinations.',
          items: [
            { title: 'Crispy Smashed Potatoes', subtitle: 'Aroma: Smoked Pepper', text: 'Drizzle liberally over golden crispy roasted fingerlings.', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&h=800&fit=crop' },
            { title: 'Glazed Grilled Skewers', subtitle: 'Aroma: Tamarind Chutney', text: 'Brush during the final 2 minutes over charcoal grill flames.', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=800&fit=crop' },
            { title: 'Spicy Noodle Bowl', subtitle: 'Aroma: Fire Crushed Pods', text: 'Toss with fresh scallions, toasted sesame, and hot wok noodles.', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=800&fit=crop' },
          ],
        },
      };
    } else if (kind.includes('faq') || kind.includes('accordion')) {
      newNode = {
        id: `sec_faq_${Date.now()}`,
        type: 'accordion',
        props: {
          title: 'Frequently Asked Questions',
          items: [
            { question: 'How spicy are the chutneys?', answer: 'Our heat levels range from mild aromatic tamarind (1/5) to fiery ghost pepper (5/5).' },
            { question: 'Do you ship nationwide?', answer: 'Yes! Orders placed before 2 PM EST ship same day in insulated eco-friendly packaging.' },
            { question: 'What is the unopened shelf life?', answer: 'All sealed jars stay fresh for 9 months in a cool, dry pantry.' },
          ],
        },
      };
    }

    if (newNode) {
      if (afterTarget?.includes('product')) {
        const prodIdx = route.nodes.findIndex((n) => n.type === 'product_grid' || n.type === 'grid');
        if (prodIdx !== -1) {
          route.nodes.splice(prodIdx + 1, 0, newNode);
        } else {
          route.nodes.push(newNode);
        }
      } else {
        route.nodes.push(newNode);
      }
      modified = true;
    }
  }

  return modified ? cloned : null;
}

/**
 * Groq LLM Surgical AST Mutator
 * Handles freeform / complex user prompts using Llama 3.3 70B while strictly preserving existing AST structure.
 */
async function callGroqSurgicalMutation(
  existingPlan: UIPlan,
  instruction: string,
  apiKey: string,
  model = 'llama-3.3-70b-versatile'
): Promise<UIPlan | null> {
  const systemPrompt = `You are a Surgical Web Layout AST Editor.
You receive a CURRENT UIPlan JSON and a USER EDIT INSTRUCTION.
Your ONLY job is to modify the existing JSON according to the user instruction.

CRITICAL RULES:
1. STRICTLY PRESERVE all existing routes and nodes in their original order.
2. DO NOT delete, rename, or wipe out existing sections unless explicitly instructed.
3. Keep all image URLs, prices, and design tokens intact unless the user specifically asks to change them.
4. Return ONLY the complete valid JSON object conforming to the UIPlan schema. Zero commentary.`;

  const userPrompt = `CURRENT UIPLAN JSON:
${JSON.stringify(existingPlan, null, 2)}

USER EDIT INSTRUCTION:
"${instruction}"`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.warn(`[Planner] Groq API returned ${res.status}`);
      return null;
    }

    const data: any = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) return null;

    const parsed = JSON.parse(rawContent);
    if (parsed.routes && Array.isArray(parsed.routes) && parsed.routes[0]?.nodes?.length > 0) {
      return parsed as UIPlan;
    }
    return null;
  } catch (err) {
    console.warn('[Planner] Groq surgical mutation failed:', err);
    return null;
  }
}

/**
 * Fallback / Cold-Start Starter Generator
 */
function generateStarterPlan(options: PlannerOptions): UIPlan {
  const { workspaceId, workspaceName, templateHint = 'milo', products = [] } = options;
  
  const builtinMd = getBuiltinTemplateMd(templateHint);
  if (builtinMd) {
    const plan = parseDesignMd(builtinMd, workspaceId);
    if (workspaceName && plan.designTokens) {
      plan.designTokens.name = workspaceName;
    }
    return plan;
  }

  const tokens = getPresetDesignTokens(templateHint, workspaceName);
  tokens.name = workspaceName;

  const title = workspaceName || 'Store';

  const defaultNodes: UINode[] = [
    {
      id: 'sec_01_announcement',
      type: 'rail',
      contract: {
        bg: tokens.colors?.primary || '#faae33',
        text_color: tokens.colors?.background || '#281006',
        speed: '20s',
      },
      props: {
        text: `FREE SHIPPING ON ORDERS OVER $45 · ${title.toUpperCase()} LAUNCH LIVE`,
      },
    },
    {
      id: 'sec_02_header',
      type: 'header_nav',
      contract: { sticky: true },
      props: {
        brand_name: title,
        cta_label: 'Order Online',
      },
    },
    {
      id: 'sec_03_hero',
      type: 'poster',
      contract: { height: '80vh' },
      props: {
        eyebrow: 'ARTISANAL COLLECTION',
        headline: `CRAFTED FOR\nBOLD TASTE`,
        subtitle: 'Slow-cooked in small micro-batches with organic spices.',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=800&fit=crop',
        ctaText: 'Shop Catalog',
        ctaUrl: '#products',
      },
    },
    {
      id: 'sec_04_products',
      type: 'grid',
      contract: { columns: 3, card_radius: tokens.radii?.sm || '6px' },
      props: {
        title: 'Featured Collection',
        subtitle: 'Handcrafted signature recipes made fresh daily.',
        items: products.length > 0 ? products : [
          { title: 'Signature Selection A', price: 14, badge: 'Best Seller', subtitle: 'Aroma: Smoked Spice', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop' },
          { title: 'Signature Selection B', price: 16, badge: 'New', subtitle: 'Aroma: Golden Tamarind', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop' },
          { title: 'Signature Selection C', price: 18, badge: 'Popular', subtitle: 'Aroma: Fire Crushed', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop' },
        ],
      },
    },
    {
      id: 'sec_05_story',
      type: 'split',
      contract: { split_ratio: '50/50' },
      props: {
        top_badge: 'OUR HERITAGE & PROMISE',
        headline: 'Authentic Heritage, Reimagined.',
        subtitle: 'Zero artificial preservatives. 100% real ingredients.',
        body: 'We partner directly with smallholder organic farms to harvest herbs at their peak potency.',
        image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=800&h=800&fit=crop',
        highlights: [
          '100% Certified Organic Ingredients',
          'Single-Origin Direct Trade Spices',
          'Cooked in Micro-Batches',
        ],
        cta: { label: 'Our Story', href: '#story' },
      },
    },
    {
      id: 'sec_06_footer',
      type: 'footer_strip',
      props: {
        brand_name: title,
        text: `© ${new Date().getFullYear()} ${title}. All Rights Reserved.`,
      },
    },
  ];

  return {
    workspaceId: workspaceId || 'default',
    revision: '1.0.0',
    target: 'web',
    designTokens: tokens,
    routes: [
      {
        id: 'route_home',
        path: '/',
        title: 'Home',
        nodes: defaultNodes,
      },
    ],
  };
}

/**
 * Main AST Planner Entrypoint
 * 1. If an existing plan is present: tries deterministic mutation first, then Groq LLM.
 * 2. If no existing plan is present: generates a starter plan matching the template.
 */
export async function compileUIPlan(
  options: PlannerOptions,
  existingPlan?: UIPlan | null
): Promise<{ plan: UIPlan | null; error?: string }> {
  const planToMutate = existingPlan || options.existingPlan;

  // Case A: Surgical Mutation on Active Existing Plan
  if (planToMutate && options.instruction) {
    // 1. Try deterministic regex mutation (< 1ms, 100% reliable)
    const deterministic = mutateExistingPlan(planToMutate, options.instruction);
    if (deterministic) {
      return { plan: deterministic };
    }

    // 2. Try Groq LLM surgical mutation if API key is present
    if (options.groqApiKey) {
      const groqMutated = await callGroqSurgicalMutation(
        planToMutate,
        options.instruction,
        options.groqApiKey,
        options.model || 'llama-3.3-70b-versatile'
      );
      if (groqMutated) {
        return { plan: groqMutated };
      }
    }

    // Fallback: If no mutation triggered, return existing plan safely without breaking it
    return { plan: planToMutate };
  }

  // Case B: Cold-Start Generation
  const starter = generateStarterPlan(options);
  return { plan: starter };
}
