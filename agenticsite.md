# Jev-Based Site Generation System — Complete Blueprint

> **Core Principle:** Generate once, serve forever. Jev decides, LLM writes, code assembles, and edge caches.

---

## 1. System Overview

```
┌──────────────┐     ┌───────────┐     ┌────────────┐     ┌───────────┐     ┌───────────┐
│  User Input  │ ──► │    Jev    │ ──► │    LLM     │ ──► │  Worker   │ ──► │  KV+Edge  │
│(brand brief) │     │ (decide)  │     │   (copy)   │     │  (build)  │     │  (serve)  │
└──────────────┘     └───────────┘     └────────────┘     └───────────┘     └───────────┘
   once per             1 call            1 call            assemble          ₹0/visit
  store/edit            ~200ms            ~3s               + cache
```

---

## 2. Layer Responsibilities

| Layer | Tool | Produces | Cost Frequency |
| :--- | :--- | :--- | :--- |
| **Structure** | `Jev` | Section choices, variants, tuning scores, toggles | Per creation/edit |
| **Copy** | `LLM` | Headlines, descriptions, CTAs, SEO meta | Per creation/edit |
| **Assembly** | `Cloudflare Worker` | JSON config → compiled HTML | Per creation/edit |
| **Storage** | `KV` | Site JSON config | — |
| **Serving** | `Cache API + KV` | Pre-rendered HTML | ₹0 per visit |
| **Commerce** | `Custom Code` | Cart, checkout, orders, products | Per transaction |

---

## 3. Component Library (Hand-Built Moat)

> **Zero Hallucination Guarantee:** Every variant is hand-built, tested, and SEO-optimized. Jev only selects from these strict presets.

| Section Type | Variants | Tunable Props |
| :--- | :--- | :--- |
| **Hero** | `split-left`, `split-right`, `centered`, `minimal-text`, `video` | `image`, `textAlign`, `ctaStyle` |
| **Product Grid** | `masonry`, `uniform-3`, `uniform-4`, `featured-row` | `columns`, `gap` |
| **Testimonials** | `carousel`, `grid`, `single-quote` | `count`, `style` |
| **Lookbook** | `full-bleed`, `collage`, `slider` | `imageCount` |
| **About** | `text-only`, `image-left`, `image-right` | — |
| **Footer** | `minimal`, `multi-column`, `newsletter` | `links`, `social` |
| **Nav** | `sticky`, `transparent`, `solid` | — |
| **Cart / Checkout** | `drawer`, `single-page`, `multi-step` | — |

---

## 4. Jev Decision Layer

### One Call, All Questions Evaluated in Parallel

```typescript
// Single parallel call evaluating discrete choices, tuning scores, and boolean feature toggles
const response = await typesafe.systemOne({
  state: {
    brand_description: userInput.description, // e.g. "handmade ceramics, earthy, minimal"
    product_count: userInput.products.length,
    industry: userInput.industry,
    target_audience: userInput.audience,
  },
  questions: {
    // ── CHOICE: Structural Variant Selection ──
    hero_variant: Choice({
      instructions: "Which hero layout fits this brand?",
      criteria: ["split-left", "split-right", "centered", "minimal-text", "video"],
    }),
    grid_variant: Choice({
      instructions: "Which product grid fits?",
      criteria: ["masonry", "uniform-3", "uniform-4", "featured-row"],
    }),
    nav_variant: Choice({
      instructions: "Which navigation style?",
      criteria: ["sticky", "transparent", "solid"],
    }),
    footer_variant: Choice({
      instructions: "Which footer layout?",
      criteria: ["minimal", "multi-column", "newsletter"],
    }),
    checkout_flow: Choice({
      instructions: "Which checkout suits these products?",
      criteria: ["drawer", "single-page", "multi-step"],
    }),

    // ── SCORE: Continuous Design Tuning ──
    color_warmth: Score({
      instructions: "How warm should the palette be?",
      criteria: ["cool/neutral", "slightly warm", "very warm/earthy"],
    }),
    spacing_density: Score({
      instructions: "How dense should layout feel?",
      criteria: ["airy", "balanced", "compact"],
    }),
    type_weight: Score({
      instructions: "How bold should typography be?",
      criteria: ["light", "medium", "bold"],
    }),
    corner_radius: Score({
      instructions: "How rounded should elements be?",
      criteria: ["sharp", "subtle", "rounded"],
    }),

    // ── NOUL: Feature Toggles ──
    show_testimonials: Noul({ instructions: "Does this brand benefit from social proof?" }),
    enable_lookbook: Noul({ instructions: "Should we include a lookbook section?" }),
    enable_blog: Noul({ instructions: "Does this merchant need a blog?" }),
    show_newsletter: Noul({ instructions: "Should newsletter signup be prominent?" }),
  },
});
```

### Answer Output Shape

| Question | Primitive Type | Return Value | Example Output |
| :--- | :--- | :--- | :--- |
| `hero_variant` | Choice | `choice`, `probabilities`, `confidence` | `"centered"`, `conf: 0.91` |
| `color_warmth` | Score | `score` (range 0–2), `confidence` | `1.8` |
| `show_testimonials` | Noul | `noul` (range 0–1) | `0.87` |

---

## 5. LLM Copy Layer

```typescript
// One-shot execution: Cached in KV alongside site config. Never re-run unless merchant edits copy.
const copy = await llm.generate({
  prompt: `Write store copy for: ${userInput.description}.
           Tone: earthy, minimal, artisan.
           Return JSON: { headline, subtext, about, cta, seoTitle, seoDesc, productBlurbs[] }`,
});
```

---

## 6. Assembly Engine (Cloudflare Worker)

```typescript
const CONFIDENCE_THRESHOLD = 0.7;

function assembleSite(answers, copy, userInput) {
  const pick = (answer, fallback) =>
    answer.confidence >= CONFIDENCE_THRESHOLD ? answer.choice : fallback;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  return {
    sections: [
      {
        type: "nav",
        variant: pick(answers.nav_variant, "sticky"),
      },
      {
        type: "hero",
        variant: pick(answers.hero_variant, "split-left"),
        content: {
          headline: copy.headline,
          subtext: copy.subtext,
          cta: copy.cta,
        },
      },
      answers.enable_lookbook.noul > 0.7 && {
        type: "lookbook",
        variant: "collage",
      },
      {
        type: "product-grid",
        variant: pick(answers.grid_variant, "uniform-3"),
        products: userInput.products,
      },
      answers.show_testimonials.noul > 0.7 && {
        type: "testimonials",
        variant: "grid",
      },
      {
        type: "about",
        variant: "image-left",
        content: { text: copy.about },
      },
      {
        type: "footer",
        variant: pick(answers.footer_variant, "minimal"),
      },
    ].filter(Boolean),

    theme: {
      "--hue": 20 + clamp(answers.color_warmth.score, 0, 2) * 15,
      "--font-weight": 300 + clamp(answers.type_weight.score, 0, 2) * 200,
      "--spacing": 1.5 - clamp(answers.spacing_density.score, 0, 2) * 0.4 + "rem",
      "--radius": clamp(answers.corner_radius.score, 0, 2) * 8 + "px",
    },

    seo: {
      title: copy.seoTitle,
      description: copy.seoDesc,
    },
  };
}
```

---

## 7. Full Request Lifecycle Flow

```
POST /create-store
  │
  ├── 1. Validate user input (products, description, industry)
  ├── 2. Call Jev          (~200ms)  ──► typed design decisions
  ├── 3. Call LLM          (~3s)     ──► copy JSON
  ├── 4. assembleSite()    (~5ms)    ──► site config
  ├── 5. Store config in KV          ──► key: site:{storeId}
  ├── 6. Compile to static HTML
  └── 7. Purge + warm edge cache

GET /:storeId/*
  │
  ├── Cache HIT   ──► Serve pre-rendered HTML    (~5ms,  ₹0)
  └── Cache MISS  ──► KV → Compile → Cache       (~30ms, ₹0)

POST /redesign
  │
  ├── Re-call Jev with updated brief
  ├── Re-call LLM ONLY if copy changed
  └── Re-assemble → KV → Purge cache
```

---

## 8. Safety & Guardrails

| Guardrail Rule | Implementation Strategy |
| :--- | :--- |
| **Low Confidence** | Fallback to safe default when `confidence < 0.7` |
| **Score Out of Bounds** | Clamp all numerical scores to safe CSS/token boundaries |
| **Copy Injection Attack** | Populate defined data slots only — never inject raw unescaped HTML |
| **Variant Whitelist** | Jev criteria strictly map to registered component keys |
| **Jev Outage Handling** | Serve last-known-good JSON config from KV; queue background retry |
| **Malformed LLM Copy** | Fallback to deterministic template strings (`Welcome to {storeName}`) |

---

## 9. Cost Economics (Exact Max Average · 1 USD = ₹100)

| Event | Jev System One | DeepSeek-V4 Copy | Worker & Edge | Total Cost (INR) | Total Cost (USD) | Credits |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Complete Site Creation** | 1 batched call | 1 full draft call | Deterministic compile | **`₹0.40`** | `$0.0040` | `4.0 cr` |
| **Surgical Redesign / Edit** | 1 batched call | *(none needed)* | Deterministic patch | **`₹0.10`** | `$0.0010` | `1.0 cr` |
| **Public Page Visit** | — | — | Edge Cache / R2 | **`₹0.00`** | `$0.0000` | `0.0 cr` |
| **10,000 Stores / Month** | 10k calls | 10k calls | Edge CDN | **`₹4,000`** | `$40.00` | `40,000 cr` |

### Detailed Breakdown Per Complete Site

| Subsystem | Engine / Model | Unit Consumption / Tokens | Rate ($ / 1M tokens) | At-Cost INR |
| :--- | :--- | :--- | :--- | :--- |
| **Structure & Design** | Jev System One (`site.create` batch) | 1 parallel batch (12 questions) | `$0.001 / request` | **`₹0.10`** (1 cr) |
| **Full Copy & SEO** | DeepSeek-V4 Multi-Turn Draft | 20k input / 8k output tokens | `$0.08 in / $0.18 out` | **`₹0.30`** (3 cr) |
| **Assembly & Edge Cache** | Cloudflare Worker + R2 + D1 | AST compile + static R2 write | Included in platform | **`₹0.00`** (0 cr) |
| **Total Max Average** | **Jev + DeepSeek** | **Complete Full Site** | — | **`₹0.40`** (4 cr) |

> **Comparison:** Raw LLM full-site generation costs **`₹25.00`** ($0.25) per generation with high hallucination risk and unpredictable markup, making Jev + DeepSeek **~62x cheaper** and deterministic.

---

## 10. Build Roadmap

| Step | Component | Scope / Effort |
| :---: | :--- | :--- |
| **1** | Component Library (30–100 sections & variants) | 4–8 weeks *(moat)* |
| **2** | Jev Question Bank + AST Mapper | 1 week |
| **3** | LLM Copy Pipeline + Slot Injection | 3 days |
| **4** | Worker Assembly + KV + Edge Cache Layer | 1 week |
| **5** | Store Onboarding Form (Brief → State) | 3 days |
| **6** | Commerce Core (Cart, Checkout, Order Engine) | Ongoing *(Core Foundation)* |

---

## 11. Platform Comparison Matrix

| Dimension | Shopify | Raw LLM Generation | This Architecture (Jev + Worker) |
| :--- | :---: | :---: | :---: |
| **Structure Quality** | ✅ Reliable | ⚠️ Variable | ✅ **Deterministic & Reliable** |
| **Copy Quality** | Merchant writes | ✅ Rich | ✅ **Rich & Tailored** |
| **Generation Cost** | — | ❌ High | ✅ **Lowest** |
| **Output Safety** | ✅ Safe | ❌ Unpredictable | ✅ **Strict Whitelist** |
| **Design Uniqueness** | ❌ Low / Generic | ✅ High | ✅ **Medium – High** |
| **Onboarding UX** | Pick & edit template | Natural description | ✅ **Natural description** |
| **Commerce Infra** | ✅ Built-in | ❌ Build from scratch | 🔨 Built with Core Code |
| **Vendor Dependency** | None | Low | ⚠️ *Jev API Dependency* |

### 12. Framer-Grade Section Redesign with Jev (360° Dimension Engine)

> **Complete Aesthetic Control:** Every visual, structural, and interactive parameter of a section is decomposed into typed Jev primitives (`Choice`, `Score`, `Noul`). Jev decides the exact design parameters in <70ms; pure code applies them to the section AST in <5ms with zero hallucination.

```
┌───────────────────────────┐     ┌────────────────────────────────────────────────────────┐     ┌────────────────────────────┐
│   Director Edit Prompt    │ ──► │                  Jev Decision Engine                   │ ──► │    Surgical AST Patch      │
│ "Make hero look like a    │     │  • Target: "sec_hero"                                  │     │  • Layout: Bento 3-up      │
│ dark Framer bento grid    │     │  • Layout: "bento_3_up"       • Motion: "spring_snappy"│     │  • Typography: Display Ser.│
│ with snappy springs and   │     │  • Typography: "editorial"    • Blur: 16px frosted     │     │  • Physics: cubic-bezier   │
│ subtle frosted glow"      │     │  • Radius: 16px               • Glow: ambient highlight│     │  • CSS Tokens: Injected    │
└───────────────────────────┘     └────────────────────────────────────────────────────────┘     └────────────────────────────┘
                                                   1 parallel call · <70ms · ₹0.10                    <5ms instant preview
```

---

### The 8 Redesign Dimensions Controlled by Jev

| # | Dimension | Jev Primitive | Tunable Scope / Choices | Output & Visual Effect |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Target & Purpose** | `Choice` | `sec_hero`, `sec_shop`, `sec_proof`, `sec_split`, `sec_footer` | Directs surgery to the exact section node |
| **2** | **Layout & Geometry** | `Choice` | `bento_3_up`, `split_16_9`, `floating_island`, `masonry_grid`, `fullbleed_stack` | Rearranges structural grid and card hierarchy |
| **3** | **Typography & Scale** | `Choice` + `Score` | Display Serif, Modern Sans, Heavy Grotesque · Scale (0.8–2.5) | Proportional font scale, letter-spacing (`-0.03em`), line-height |
| **4** | **Color & Surfaces** | `Choice` + `Score` | `canvas`, `surface`, `ink`, `accent` · Warmth (0–2), Saturation (0–2) | Background tones, contrast inversion, palette temperature |
| **5** | **Glass, Borders & Depth** | `Score` x 3 | Border hairline (0.5–2px), Glass blur (0–24px), Elevation shadow (0–3) | 1px subtle edge glows, frosted glass cards, layered 3D depth |
| **6** | **Media & Aspect Ratio** | `Choice` + `Score` | `16:9`, `4:5`, `1:1`, `21:9` · Zoom-on-hover intensity (0–2) | Image framing, parallax layers, hover scale transforms |
| **7** | **Motion & Spring Physics**| `Choice` + `Score` | `spring_snappy`, `spring_gentle`, `cinematic_slow` · Entrance reveal | `cubic-bezier` physics curves, staggered scroll cascade |
| **8** | **Feature Toggles** | `Noul` x N | Eyebrow badges, Quick-add buttons, Rating stars, Stock tags, CTAs | Toggles sub-elements without rewriting DOM markup |

---

### Complete 360° Parallel Redesign Query

```typescript
// Single parallel call evaluating all 8 aesthetic dimensions simultaneously
const redesignResponse = await typesafe.systemOne({
  state: {
    command: "Make this product showcase look like a dark Framer bento grid with glowing borders and snappy springs",
    target_section: "sec_shop",
    current_tokens: activeSiteDocument.theme,
  },
  questions: {
    // ── 1. Target Identification ──
    target_node: Choice({
      instructions: "Which section ID does the user request target?",
      criteria: ["sec_hero", "sec_shop", "sec_features", "sec_proof", "sec_contact", "global_theme"],
    }),

    // ── 2. Layout Geometry & Grid ──
    layout_geometry: Choice({
      instructions: "What high-craft layout archetype best fits the request?",
      criteria: [
        "bento_asymmetric_3", // Featured hero card + 2 stacked side widgets
        "uniform_4_grid",     // 4-column balanced product grid
        "split_sticky_left",   // Pinned visual sidebar on left + scrollable right
        "floating_card_stack", // Elevated frosted cards over continuous canvas
      ],
    }),

    // ── 3. Typography & Hierarchy ──
    typography_voice: Choice({
      instructions: "Which typographic personality fits the prompt?",
      criteria: ["editorial_serif", "modern_sans", "heavy_grotesque", "mono_clean"],
    }),
    type_scale_ratio: Score({
      instructions: "How dominant and oversized should heading typography be?",
      criteria: ["1: restrained (1.25x)", "2: balanced (1.41x)", "3: massive_display (1.8x)"],
    }),

    // ── 4. Tonal Surface & Contrast ──
    surface_tone: Choice({
      instructions: "Which surface color pair should this section adopt?",
      criteria: ["canvas (light)", "surface (tinted)", "ink (dark bento)", "accent (brand vibrant)"],
    }),

    // ── 5. Glass, Borders & Elevation (Continuous Scores) ──
    border_treatment: Score({
      instructions: "How pronounced should subtle 1px border highlights or spotlights be?",
      criteria: ["none", "1px hairline border", "luminous ambient glow"],
    }),
    glass_blur: Score({
      instructions: "How much frosted glass backdrop-blur should be applied?",
      criteria: ["none (solid)", "subtle_frosted (8px)", "deep_frosted (20px)"],
    }),
    corner_radius: Score({
      instructions: "What corner radius best balances the aesthetic?",
      criteria: ["sharp (0-4px)", "modern_bento (16px)", "pill (28px+)"],
    }),
    shadow_depth: Score({
      instructions: "How much ambient layered drop-shadow elevation to apply?",
      criteria: ["flat (0px)", "crisp_layer (12px)", "deep_floating (32px)"],
    }),

    // ── 6. Motion & Spring Physics ──
    motion_physics: Choice({
      instructions: "What spring animation profile should drive hover and scroll interactions?",
      criteria: [
        "spring_snappy",   // Fast, playful spring: cubic-bezier(0.175, 0.885, 0.32, 1.275)
        "spring_gentle",   // Smooth modern SaaS: cubic-bezier(0.16, 1, 0.3, 1)
        "cinematic_slow",  // Luxury slow-ease: cubic-bezier(0.25, 1, 0.5, 1)
        "none",            // Static zero-motion
      ],
    }),

    // ── 7. Sub-Element Feature Toggles (Noul) ──
    show_badge_pill:    Noul({ instructions: "Display floating category/sale badges?" }),
    enable_quick_add:   Noul({ instructions: "Include 1-tap quick add button on cards?" }),
    show_rating_stars:  Noul({ instructions: "Show customer review star ratings?" }),
    show_hover_zoom:    Noul({ instructions: "Enable smooth image scale on card hover?" }),
  },
});
```

---

### Universal AST Mutation Engine (<5ms)

```typescript
// Pure deterministic code applies all 8 dimensions to the targeted AST node in <5ms
function applySectionRedesign(doc, answers) {
  const targetId = answers.target_node.choice;
  const section = doc.pages[0].sections.find((s) => s.id === targetId);
  if (!section) return doc;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // 1. Mutate Layout Primitive
  section.layout = {
    kind: answers.layout_geometry.choice.split("_")[0],
    variant: answers.layout_geometry.choice,
  };

  // 2. Set Surface Tone
  section.style.base.tone = answers.surface_tone.choice;

  // 3. Inject High-Craft Framer CSS Tokens
  const radiusPx = Math.round(4 + clamp(answers.corner_radius.score, 0, 2) * 12);
  const blurPx = Math.round(clamp(answers.glass_blur.score, 0, 2) * 10);

  section.style.tokens = {
    "--section-radius": `${radiusPx}px`,
    "--backdrop-blur": blurPx > 0 ? `blur(${blurPx}px)` : "none",
    "--border-hairline": answers.border_treatment.score > 1.0
      ? "1px solid rgba(255, 255, 255, 0.12)"
      : "1px solid var(--line-hairline)",
    "--box-shadow": answers.shadow_depth.score > 1.0
      ? "0 20px 40px -15px rgba(0,0,0,0.35), 0 0 1px 1px rgba(255,255,255,0.05)"
      : "0 2px 6px rgba(0,0,0,0.04)",
    "--motion-curve": answers.motion_physics.choice === "spring_snappy"
      ? "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
      : "cubic-bezier(0.16, 1, 0.3, 1)",
    "--type-scale": `${1.0 + clamp(answers.type_scale_ratio.score, 0, 2) * 0.4}`,
  };

  // 4. Update Element Feature Toggles
  section.features = {
    badge: answers.show_badge_pill.probability > 0.6,
    quickAdd: answers.enable_quick_add.probability > 0.5,
    ratings: answers.show_rating_stars.probability > 0.7,
    hoverZoom: answers.show_hover_zoom.probability > 0.5,
  };

  doc.revision += 1;
  return doc;
}
```

---

### Comparison: Redesigning Everything via Jev vs. LLM Code Generation

| Metric | Raw LLM Code Rewrite | Complete Jev Dimension Engine |
| :--- | :--- | :--- |
| **Aesthetic Quality** | Hit or miss; unpredictable Tailwind/CSS | **Guaranteed Framer-grade craftsmanship** |
| **Broken Layout Risk** | High (div mismatch, missing closing tags) | **0% (Pure validated AST mutations)** |
| **Turnaround Time** | 4,000ms – 8,000ms | **<70ms total round-trip** |
| **Cost per Redesign** | ₹10.00 – ₹25.00 ($0.10 – $0.25) | **₹0.10** ($0.001 / 1 credit) |
| **Reversibility** | Hard to diff / undo cleanly | **Instant 1-tap Undo (immutable rev N+1)** |
| **Commerce Safety** | Might drop live DB pricing or cart bindings | **100% Isolated: DB bindings & prices untouched** |

---

> **Summary:** Jev picks the design, LLM writes the words, your Worker assembles from tested components, and the edge serves it free forever — describe-to-store UX at template reliability and near-zero marginal cost.


