# End-to-End Jev Site AI: Autonomous Creation, Correction & Publish

This document demonstrates the concrete end-to-end lifecycle of an **Autonomous AI Agent Storefront** built with TAR Site AI: **1-Shot Autonomous Creation**, **Jev System One Bounded Decisions**, **Voice/Text Fragment Corrections**, and **Atomic Zero-AI Public Serving**.

---

## Scenario: The Business

* **Business Name**: *Kanchi Silks* (Kanchipuram handloom silk sarees).
* **Workspace State**: 18 active products in Turso DB (prices ₹3,500 – ₹18,000), 1 store address, 1 WhatsApp order phone number, 2 hero photography assets uploaded to R2.

---

## 1. Autonomous Creation (Business Facts $\rightarrow$ rev 1 in <120ms)

The agent autonomously pictures and constructs the entire storefront without asking the owner a single design question.

### Step 1: Owner inputs business facts (or workspace auto-provides)
```json
{
  "brief": {
    "goal": "Traditional Kanchipuram silk sarees with WhatsApp orders and home delivery",
    "audience": "Bridal shoppers and festive wear buyers",
    "tone": "Rich, traditional, elegant"
  },
  "facts": {
    "products_count": 18,
    "phone": "+919876543210",
    "hours": ["Mon-Sat: 10:00 AM - 8:00 PM"],
    "city": "Kanchipuram"
  }
}
```

---

### Step 2: Code sends 1 batched parallel request to Jev System One

#### 📤 Jev Input Payload (`site.create` batch)
```json
{
  "state": {
    "brief": {
      "goal": "Traditional Kanchipuram silk sarees with WhatsApp orders and home delivery",
      "audience": "Bridal shoppers and festive wear buyers",
      "tone": "Rich, traditional, elegant"
    },
    "facts": {
      "products_count": 18,
      "has_hours": true,
      "has_phone": true
    },
    "themes": [
      "editorial-light",
      "editorial-lookbook",
      "editorial-chalk",
      "streetwear-dark",
      "minimal-clean"
    ],
    "purposes": [
      "introduction",
      "collection",
      "split",
      "story",
      "recommendations",
      "hours",
      "contact",
      "promo"
    ]
  },
  "questions": {
    "theme": {
      "type": "choice",
      "instructions": "Which registered theme best fits the brief?",
      "criteria": {
        "editorial-lookbook": "Editorial lookbook on white paper with hairlines and photography.",
        "editorial-chalk": "Warm paper canvas with a single blue accent.",
        "minimal-clean": "Neutral restrained canvas for any business."
      }
    },
    "density": {
      "type": "score",
      "instructions": "How much breathing room does this brief ask for?",
      "criteria": ["1: Compact", "2: Balanced", "3: Airy"]
    },
    "tone": {
      "type": "choice",
      "instructions": "Which opening section tone suits the brief?",
      "criteria": {
        "canvas": "Light canvas background.",
        "surface": "Tinted panel background.",
        "ink": "Dark background.",
        "accent": "Brand accent background."
      }
    },
    "columns": {
      "type": "choice",
      "instructions": "How many columns should the catalog grid use on wide screens?",
      "criteria": { "2": "2 columns", "3": "3 columns", "4": "4 columns" }
    },
    "heroStyle": {
      "type": "choice",
      "instructions": "Which hero arrangement suits the brief?",
      "criteria": {
        "fullbleed_16_6": "Wide full-bleed image with centered title.",
        "split_16_9": "Headline beside imagery in split arrangement."
      }
    },
    "flow": {
      "type": "choice",
      "instructions": "Which home page section order suits the brief?",
      "criteria": {
        "classic_lookbook": "Products lead after hero with an editorial break.",
        "commerce_first": "Every product surface leads immediately."
      }
    },
    "quickAdd": {
      "type": "noul",
      "instructions": "Should product cards carry a quick-add action?"
    },
    "p:collection": { "type": "noul", "instructions": "Include product collection grid?" },
    "p:split": { "type": "noul", "instructions": "Include 2-photo editorial split showcase?" },
    "p:hours": { "type": "noul", "instructions": "Include opening hours block?" },
    "p:contact": { "type": "noul", "instructions": "Include WhatsApp and location block?" },
    "p:promo": { "type": "noul", "instructions": "Include promo banner?" }
  }
}
```

---

### Step 3: Jev responds in <80ms

#### 📥 Jev Output Payload
```json
{
  "answers": {
    "theme": { "choice": "editorial-lookbook", "confidence": 0.94 },
    "density": { "score": 2, "confidence": 0.88 },
    "tone": { "choice": "canvas", "confidence": 0.91 },
    "columns": { "choice": "4", "confidence": 0.85 },
    "heroStyle": { "choice": "fullbleed_16_6", "confidence": 0.92 },
    "flow": { "choice": "classic_lookbook", "confidence": 0.90 },
    "quickAdd": { "probability": 0.89 },
    "p:collection": { "probability": 0.99 },
    "p:split": { "probability": 0.92 },
    "p:hours": { "probability": 0.95 },
    "p:contact": { "probability": 0.98 },
    "p:promo": { "probability": 0.12 }
  }
}
```

---

### Step 4: Pure Code Builder stamps out the complete `SiteDocument`

Code constructs the document AST without writing freeform HTML/CSS:
* Applies `editorial-lookbook` design tokens (#ffffff canvas, #000000 ink, 0px radius, 4 columns).
* Excludes `promo` section (probability 0.12 < 0.55 threshold).
* Binds `collection` section directly to Turso DB live catalog.
* Generates **`rev 1`** in Studio preview in **<120ms total**.

```json
{
  "schema": "2.0.0",
  "revision": 1,
  "pages": [{
    "path": "/",
    "sections": [
      {
        "id": "sec_hero",
        "purpose": "introduction",
        "layout": { "kind": "stack" },
        "style": { "base": { "tone": "canvas" } }
      },
      {
        "id": "sec_shop",
        "purpose": "collection",
        "layout": { "kind": "grid", "columns": 4 },
        "bindings": [{ "query": "catalog.public", "limit": 18 }]
      },
      {
        "id": "sec_split",
        "purpose": "split",
        "layout": { "kind": "grid", "columns": 2 }
      },
      {
        "id": "sec_hours",
        "purpose": "hours",
        "layout": { "kind": "flow" }
      },
      {
        "id": "sec_contact",
        "purpose": "contact",
        "layout": { "kind": "flex" }
      }
    ]
  }]
}
```

The site is **100% complete and ready to publish immediately**.

---

## 2. Optional Correction Layer (Touch 2: Speech Fragment $\rightarrow$ rev 2)

If the merchant is happy, they click **[Publish]** immediately. If they want an adjustment, they speak into the mic:
> *"Make the saree collection section dark with 3 columns instead of 4."*

### Step 1: 3-Lane Router dispatches to Jev `interpret()`
Because the request specifies relative styling changes ("dark", "3 columns"), the router selects the Jev decision lane.

#### 📤 Jev Edit Input
```json
{
  "state": {
    "command": "Make the saree collection section dark with 3 columns instead of 4",
    "targets": [
      { "id": "sec_hero", "label": "Hero Banner", "purpose": "introduction" },
      { "id": "sec_shop", "label": "Saree Collection", "purpose": "collection" },
      { "id": "sec_split", "label": "Editorial Photos", "purpose": "split" },
      { "id": "sec_contact", "label": "Contact Us", "purpose": "contact" }
    ]
  },
  "questions": {
    "target": {
      "type": "choice",
      "instructions": "Which section does the request most likely target?",
      "criteria": {
        "sec_hero": "Hero Banner",
        "sec_shop": "Saree Collection",
        "sec_split": "Editorial Photos",
        "sec_contact": "Contact Us",
        "none": "No section matches"
      }
    },
    "q:tone": {
      "type": "choice",
      "instructions": "Which tone does the request ask for?",
      "criteria": {
        "canvas": "Light canvas",
        "surface": "Tinted surface",
        "ink": "Dark background",
        "accent": "Accent background",
        "keep": "Leave unchanged"
      }
    },
    "q:columns": {
      "type": "choice",
      "instructions": "How many columns?",
      "criteria": {
        "2": "2 columns",
        "3": "3 columns",
        "4": "4 columns",
        "keep": "Leave unchanged"
      }
    },
    "q:density": {
      "type": "choice",
      "instructions": "Spacing density change?",
      "criteria": {
        "compact": "Compact",
        "airy": "Airy",
        "keep": "Leave unchanged"
      }
    }
  }
}
```

#### 📥 Jev Edit Output
```json
{
  "answers": {
    "target": { "choice": "sec_shop", "confidence": 0.98 },
    "q:tone": { "choice": "ink", "confidence": 0.96 },
    "q:columns": { "choice": "3", "confidence": 0.97 },
    "q:density": { "choice": "keep", "confidence": 0.99 }
  }
}
```
*Notice surgical isolation: `density` returns `keep` (`null`), leaving padding and type sizes untouched.*

---

### Step 2: Code applies atomic AST Patch

```typescript
// Code modifies the targeted AST node directly:
doc.pages[0].sections[1].style.base.tone = 'ink';       // Dark surface, white text
doc.pages[0].sections[1].layout.columns = 3;            // 3-column catalog grid
doc.revision = 2;                                       // Saved as rev 2
```

Preview updates in **<70ms** with an inline **`[ Undo ]`** button.

---

## 3. 1-Click Atomic Publish ($0 AI Public Serving)

When the merchant clicks **`[ Publish ]`**:
1. **Pre-Flight Validation (Code)**:
   - WCAG contrast checked (all pairs $\ge 4.5:1$).
   - Touch targets checked ($\ge 44\text{px}$).
   - Turso DB active prices and stock verified.
2. **Atomic R2 Release**:
   - Compiler generates release manifest and static HTML/CSS files $\rightarrow$ uploaded to Cloudflare R2.
   - Cloudflare D1 `CONTROL` table epoch flips live pointer instantly.
3. **Public Serving**:
   - Visitors access `https://kanchi-silks.tar.site/`.
   - Cloudflare Worker serves static HTML in **<1ms** with **ZERO ($0.00) AI runtime cost**.
