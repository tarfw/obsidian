/**
 * 12 Universal Variant Dimensions & Jev System One Detection
 * As specified in toolsconcept.md §3:
 * 1. size      2. length    3. weight    4. volume
 * 5. color     6. flavour   7. material  8. portion
 * 9. prep     10. time     11. tier     12. pack
 */

import { askSystemOne } from '../brain/systemone.ts';

export type DimensionKey =
  | 'size'
  | 'length'
  | 'weight'
  | 'volume'
  | 'color'
  | 'flavour'
  | 'material'
  | 'portion'
  | 'prep'
  | 'time'
  | 'tier'
  | 'pack'
  | 'none';

export interface DetectedVariant {
  name: string;
  dimension: DimensionKey;
  option: string;
  priceDelta?: number;
}

export interface VariantDetectionResult {
  dimension: DimensionKey;
  variants: DetectedVariant[];
  source: 'jev' | 'deterministic';
  category?: string;
  unit?: string;
  tax?: number;
  title?: string;
  sku?: string;
}

export const UNIVERSAL_DIMENSIONS: Record<DimensionKey, { category: string; description: string; examples: string[] }> = {
  size: { category: 'Physical Space', description: 'Clothing, shoe size, or dimensions', examples: ['S', 'M', 'L', 'XL', 'XXL', '38', '40', '42'] },
  length: { category: 'Physical Dimension', description: 'Traditional textile length (Muzham, meters) or wire', examples: ['4-Muzham', '8-Muzham', '6.2m', '10m'] },
  weight: { category: 'Mass / Volume', description: 'Mass or grocery weight (grams, kg, bag, Pavan)', examples: ['100g', '250g', '500g', '1kg', '2kg', '5kg', '25kg', '1 Pavan'] },
  volume: { category: 'Liquid Capacity', description: 'Liquid volume (ml, L, Can)', examples: ['100ml', '200ml', '500ml', '1L', '2L', '5L'] },
  color: { category: 'Sensory Quality', description: 'Color, shade, or pattern', examples: ['Sivappu', 'Neelam', 'Manjal', 'Vellai', 'Karuppu', 'Red', 'Blue', 'Green'] },
  flavour: { category: 'Sensory Quality', description: 'Food flavor or aroma', examples: ['Chocolate', 'Vanilla', 'Strawberry', 'Badam', 'Pista', 'Sandalwood'] },
  material: { category: 'Material Grade', description: 'Metal, fabric, or wood grade', examples: ['Pure Silk', 'Art Silk', 'Pure Cotton', 'Silver 92.5', 'Teak'] },
  portion: { category: 'Food & Canteen', description: 'Meal serving', examples: ['Single', 'Quarter', 'Half', 'Full', 'Single cup', 'Flask'] },
  prep: { category: 'Custom / Recipe', description: 'Dietary or tailoring option', examples: ['Eggless', 'No Sugar', 'With Lining', 'Extra Spicy'] },
  time: { category: 'Duration / Service', description: 'Rental or service duration', examples: ['1 Hour', '1 Day', '1 Week', '1 Month'] },
  tier: { category: 'Turnaround / Level', description: 'Speed or service level', examples: ['Standard', 'Express', 'VIP'] },
  pack: { category: 'Trade Packaging', description: 'Pack count or wholesale bundle', examples: ['1x Single', 'Pack of 3', 'Pack of 6', 'Box of 12', 'Box of 50'] },
  none: { category: 'Fixed', description: 'Single fixed item with no options', examples: [] },
};

export function inferDeterministicDepartment(text: string, trade = 'retail'): { category: string; unit: string; tax: number } {
  const lower = text.toLowerCase();
  if (/\b(silk|pattu|saree|sari|dhoti|veshti|handloom|cotton|angavastram|zari|pallu|weaver)\b/.test(lower)) {
    return { category: 'Traditional Silk & Handlooms', unit: 'piece', tax: 500 };
  }
  if (/\b(shirt|pant|tshirt|trouser|kurta|dress|salwar|apparel|jeans|cloth)\b/.test(lower)) {
    return { category: 'Apparel & Readymade', unit: 'piece', tax: 500 };
  }
  if (/\b(sweet|halwa|laddu|mysore pak|snack|mixture|bakery|cake|biscuit|tea|coffee|kaapi|grocery|rice|dal|oil|ghee|masala|spice)\b/.test(lower)) {
    return { category: 'Sweets & Provisions', unit: 'kg', tax: 500 };
  }
  if (/\b(brass|vilakku|lamp|idol|statue|handicraft|pottery|craft)\b/.test(lower)) {
    return { category: 'Handicrafts & Decor', unit: 'piece', tax: 1200 };
  }
  if (trade === 'pos' || trade === 'textile' || trade === 'handloom') {
    return { category: 'Traditional Silk & Handlooms', unit: 'piece', tax: 500 };
  }
  return { category: 'General Merchandise', unit: 'piece', tax: 500 };
}

/**
 * Deterministic fallback regex matching for fast, offline or zero-API detection.
 */
export function extractDeterministicVariants(text: string, baseTitle = ''): { dimension: DimensionKey; options: string[] } {
  const combined = `${baseTitle} ${text}`.trim();

  // 1. Length (Muzham, meters)
  const lengthMatch = combined.match(/\b(\d+(?:\.\d+)?\s*(?:muzham|முழம்|m|meter|meters|metre|metres))\b/gi);
  if (lengthMatch && lengthMatch.length > 0) {
    return { dimension: 'length', options: Array.from(new Set(lengthMatch.map((s) => s.trim().replace(/\s+/g, '-')))) };
  }
  if (/\bmuzham|முழம்\b/i.test(combined)) {
    return { dimension: 'length', options: ['4-Muzham', '8-Muzham'] };
  }

  // 2. Weight (g, kg, grams)
  const weightMatch = combined.match(/\b(\d+(?:\.\d+)?\s*(?:kg|g|gram|grams|gm|gms|pavan))\b/gi);
  if (weightMatch && weightMatch.length > 0) {
    return { dimension: 'weight', options: Array.from(new Set(weightMatch.map((s) => s.trim().replace(/\s+/g, '')))) };
  }

  // 3. Volume (ml, L, liter)
  const volMatch = combined.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|liter|litre|liters|litres))\b/gi);
  if (volMatch && volMatch.length > 0) {
    return { dimension: 'volume', options: Array.from(new Set(volMatch.map((s) => s.trim().replace(/\s+/g, '')))) };
  }

  // 4. Size (S, M, L, XL, XXL)
  const sizeTokens = text.split(/[,/&\s]+/).map((s) => s.trim().toUpperCase());
  const foundSizes = sizeTokens.filter((s) => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '28', '30', '32', '34', '36', '38', '40', '42'].includes(s));
  if (foundSizes.length >= 2) {
    return { dimension: 'size', options: Array.from(new Set(foundSizes)) };
  }

  // 5. Portion (Half, Full, Quarter)
  const portionMatch = combined.match(/\b(single|quarter|half|full)\b/gi);
  if (portionMatch && portionMatch.length > 0) {
    return { dimension: 'portion', options: Array.from(new Set(portionMatch.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))) };
  }

  // 6. Color (Red, Blue, Sivappu, Neelam)
  const colorMatch = combined.match(/\b(sivappu|neelam|manjal|pachai|karuppu|vellai|red|blue|green|yellow|black|white|pink|maroon)\b/gi);
  if (colorMatch && colorMatch.length > 0) {
    return { dimension: 'color', options: Array.from(new Set(colorMatch.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))) };
  }

  // 7. Pack count (Pack of 3, 6, 12)
  const packMatch = combined.match(/\b(?:pack|box)\s+of\s+(\d+)\b/gi);
  if (packMatch && packMatch.length > 0) {
    return { dimension: 'pack', options: Array.from(new Set(packMatch.map((s) => s.trim()))) };
  }

  // Default: if options separated by commas
  const commaSeparated = text.split(/[,/]+/).map((s) => s.trim()).filter(Boolean);
  if (commaSeparated.length >= 2) {
    return { dimension: 'size', options: commaSeparated };
  }

  return { dimension: 'none', options: [] };
}

/**
 * Detect variants, category, and commerce traits using Jev System One with deterministic fallback.
 */
export async function detectProductVariants(
  apiKey: string | undefined,
  params: { product: string; input?: string; taste?: string; trade?: string },
): Promise<VariantDetectionResult> {
  const { product, trade = 'retail' } = params;
  const input = (params.taste || params.input || '').trim();
  const deterministic = extractDeterministicVariants(input, product);
  const deptFallback = inferDeterministicDepartment(`${product} ${input}`, trade);
  const baseName = (product.trim() || input.trim().split(/[,;]/)[0] || 'Item').trim();
  const skuFallback = `SKU-${baseName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10)}`;

  if (!apiKey || !input.trim()) {
    const variants: DetectedVariant[] = deterministic.options.map((opt) => ({
      name: `${baseName} (${opt})`,
      dimension: deterministic.dimension,
      option: opt,
    }));
    return {
      dimension: deterministic.dimension,
      variants,
      source: 'deterministic',
      category: deptFallback.category,
      unit: deptFallback.unit,
      tax: deptFallback.tax,
      title: baseName,
      sku: skuFallback,
    };
  }

  try {
    const criteria: Record<string, string> = {};
    for (const [key, dim] of Object.entries(UNIVERSAL_DIMENSIONS)) {
      criteria[key] = dim.description;
    }

    const outcome = await askSystemOne(apiKey, {
      state: { trade, product, input },
      questions: {
        dimension: {
          type: 'choice',
          instructions: 'Which of the 12 universal variant dimensions does `input` specify for `product`?',
          criteria,
        },
        category: {
          type: 'choice',
          instructions: 'Which retail trade department best categorizes `product` and `input`?',
          criteria: {
            textiles: 'Traditional silk, handlooms, sarees, dhotis, fabrics',
            apparel: 'Modern readymade clothing, shirts, dresses',
            food: 'Sweets, savouries, bakery, groceries, provisions, spices',
            crafts: 'Brass, pooja items, handicrafts, home decor',
            general: 'General store merchandise',
          },
        },
        unit: {
          type: 'choice',
          instructions: 'What is the standard trade inventory unit for `product`?',
          criteria: {
            piece: 'Finished individual piece or garment count',
            meter: 'Cut length of fabric or wire',
            kg: 'Weight mass for food, provisions, or bulk items',
            pack: 'Packaged bundle or box count',
          },
        },
      },
      timeout: 3000,
    });

    if (outcome.ok) {
      const chosen = String(outcome.value.answers.dimension?.choice || deterministic.dimension) as DimensionKey;
      const validDimension = (chosen in UNIVERSAL_DIMENSIONS) ? chosen : deterministic.dimension;
      const options = deterministic.options.length > 0
        ? deterministic.options
        : (UNIVERSAL_DIMENSIONS[validDimension]?.examples.slice(0, 2) || []);

      const chosenCategoryKey = String(outcome.value.answers.category?.choice || '');
      const categoryMap: Record<string, { name: string; tax: number }> = {
        textiles: { name: 'Traditional Silk & Handlooms', tax: 500 },
        apparel: { name: 'Apparel & Readymade', tax: 500 },
        food: { name: 'Sweets & Provisions', tax: 500 },
        crafts: { name: 'Handicrafts & Decor', tax: 1200 },
        general: { name: 'General Merchandise', tax: 500 },
      };
      const catResolved = categoryMap[chosenCategoryKey] || deptFallback;

      const chosenUnit = String(outcome.value.answers.unit?.choice || deptFallback.unit);
      const validUnit = ['piece', 'meter', 'kg', 'pack'].includes(chosenUnit) ? chosenUnit : deptFallback.unit;

      const variants: DetectedVariant[] = options.map((opt) => ({
        name: `${baseName} (${opt})`,
        dimension: validDimension,
        option: opt,
      }));

      return {
        dimension: validDimension,
        variants,
        source: 'jev',
        category: catResolved.name,
        unit: validUnit,
        tax: catResolved.tax,
        title: baseName,
        sku: skuFallback,
      };
    }
  } catch {
    // Fall back cleanly to deterministic resolution
  }

  const variants: DetectedVariant[] = deterministic.options.map((opt) => ({
    name: `${baseName} (${opt})`,
    dimension: deterministic.dimension,
    option: opt,
  }));

  return {
    dimension: deterministic.dimension,
    variants,
    source: 'deterministic',
    category: deptFallback.category,
    unit: deptFallback.unit,
    tax: deptFallback.tax,
    title: baseName,
    sku: skuFallback,
  };
}
