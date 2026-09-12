---
version: alpha
name: Sweetgreen
description: Farm-stand chalkboard at golden hour — saturated food photography on a warm cream canvas, anchored by deep forest green and a single electric lime action color.

colors:
  primary: "#00473c"        # Deep Forest — brand, nav, dark pills, text accents
  secondary: "#d8e5d6"      # Sage Mist — section bands, card surfaces
  tertiary: "#e6ff55"       # Lime Glow — the only interaction accent
  neutral: "#f4f3e7"        # Cream Canvas — the page background
  surface: "#f4f3e7"
  on-surface: "#0e150e"     # Forest Shadow — primary text
  accent-warm: "#e8dcc6"    # Warm Sand — alternate band
  ink: "#000000"            # Pure Ink — maximum contrast
  muted: "#8c8c82"          # Warm Gray — borders and separators
  disabled: "#555555"       # Slate Gray — low-emphasis text

typography:
  display-lg:
    fontFamily: SweetSans
    fontSize: 80px
    fontWeight: 400
    lineHeight: 0.85
  display:
    fontFamily: SweetSans
    fontSize: 70px
    fontWeight: 400
    lineHeight: 0.85
  heading-lg:
    fontFamily: SweetSans
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.047em
  heading:
    fontFamily: SweetSans
    fontSize: 40px
    fontWeight: 400
    lineHeight: 0.85
  subheading:
    fontFamily: SweetSansText
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.03em
  body:
    fontFamily: SweetSansText
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0.017em
  body-sm:
    fontFamily: SweetSansText
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.29
    letterSpacing: 0.017em
  label:
    fontFamily: SweetSansText
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.05em
  caption:
    fontFamily: SweetSansText
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0.2em

rounded:
  sm: 4px
  md: 8px
  images: 20px
  badges: 20px
  cards: 24px
  full: 9999px

spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 60px
  section: 80px
  gutter: 24px
  margin: 32px

components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    padding: 16px 24px
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
  button-outline:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 12px 20px
  badge-online:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.badges}"
    padding: 4px 12px
---

# Sweetgreen

## Overview

A warm, farm-stand-meets-modern-typography aesthetic. The canvas is a cream off-white rooted in natural materials; deep forest green is the structural anchor; electric lime is the single high-energy action color. Photography carries the brand and typography does the heavy lifting on chrome. The UI should feel organic and calm, never clinical — confident through restraint rather than decoration.

## Colors

The palette is intentionally restricted to one action color and one brand green.

- **Primary (`{colors.primary}`):** Deep Forest — the structural green for logo, nav, dark pills, text accents and link color.
- **Secondary (`{colors.secondary}`):** Sage Mist — soft botanical bands and card surfaces that signal freshness without competing with photography.
- **Tertiary (`{colors.tertiary}`):** Lime Glow — the green action color, used only for filled buttons, selected navigation states and focused conversion moments.
- **Neutral (`{colors.neutral}`):** Cream Canvas — the base page background.
- **Warm Sand (`{colors.accent-warm}`):** alternate full-width band.
- **Forest Shadow (`{colors.on-surface}`):** primary text, borders and input strokes.
- **Pure Ink (`{colors.ink}`):** maximum-contrast text and hairlines.
- **Warm Gray (`{colors.muted}`) / Slate Gray (`{colors.disabled}`):** medium-contrast borders and low-emphasis text.

Do not promote Warm Gray to the primary CTA role, and do not add an accent outside this list.

## Typography

Two display faces and one text face do the work.

- **SweetSans:** display headlines, hero text and large category labels, set at extreme sizes (70–80px) with tight leading (0.85). Weight 400 at this size is the signature choice — calm authority that does not shout.
- **Grenette:** secondary display accent, ultra-thin (200) with extreme negative tracking, used sparingly as an editorial counterpoint.
- **SweetSansText:** body, navigation, button labels and card copy. Weight 700 for labels and CTAs, 400 for body, with positive tracking (0.01–0.05em) that improves small-size legibility.
- **Eyebrow labels:** all-caps SweetSansText weight 700 at 14px with 0.05em tracking, placed 16–24px above the headline they qualify.

## Layout

Full-bleed hero photography with a bottom-left text overlay panel. Max-width 1200px centered for content sections. Section rhythm alternates the cream canvas with full-width Sage Mist or Warm Sand bands at 80–120px vertical padding. Menu content uses a 3-column card grid. Editorial sections use a 2-column split (text left, one full-bleed photograph right). Navigation is a single top bar. Generous whitespace creates a calm, gallery-like pacing.

## Elevation & Depth

Depth is tonal, not shadowed. The cream canvas or a colored band forms the base; content sits directly on it. The only shadow in the system is `rgba(14, 21, 14, 0.4) 3px 3px 32px -10px`, reserved for product cards and CTA buttons.

## Shapes

The shape language is soft-organic. Product images, cards and badges use 20–24px radii; inputs use 8px; buttons are fully rounded pills (9999px). Buttons are never rectangles or capsules.

## Components

- **Pill CTA Button (Lime Fill):** `{colors.tertiary}` background, `{colors.on-surface}` text in SweetSansText weight 700 at 16–18px, `{rounded.full}`, padding 16px 24px. The highest-contrast functional element on a page.
- **Pill Outline Button (Forest Border):** transparent or cream fill, 2px `{colors.primary}` border, `{colors.primary}` text at 16px, padding 12px 20px. Lighter weight than the primary CTA.
- **Ghost Text Link:** no background, no border, `{colors.on-surface}` text weight 700 at 16px with a right-arrow glyph; underline on hover only. The arrow is the anchor.
- **Navigation Bar:** `{colors.neutral}` background, centered wordmark in `{colors.primary}`, flanking items in SweetSansText 700 at 14px all-caps with 0.05em tracking; the right item is a Pill Outline Button.
- **Menu Category Tab:** large text-only tab, no border or background. Active is `{colors.on-surface}` in SweetSans 40px with a small dot indicator; inactive is the same without the dot. Scale is the navigation signal.
- **Product Card:** square photograph with a 20px radius; below it 24px padding, name in SweetSansText 700 at 20px, description at 16px with 1.25 line-height, then a Ghost Text Link. No card background, border or shadow — the photograph is the card.
- **Online Only Badge:** absolute top-left of a product image; `{colors.tertiary}` background, 12px all-caps text with 0.05em tracking, `{rounded.badges}`, padding 4px 12px.
- **Full-Bleed Hero with Text Overlay:** full-width photograph as the background; a cream panel at ~90% opacity anchored bottom-left with 40px padding containing an eyebrow, the display headline at 70–80px, and a Pill CTA.
- **Split Content Section:** two columns on a Sage Mist or Warm Sand background; left is a text stack with a 48–70px display headline and bold sub-labels; right is a single full-bleed photograph at 20px radius; 80–120px vertical padding.

## Do's and Don'ts

- Do use SweetSans at 70–80px weight 400 with 0.85 line-height for primary display headlines.
- Do default to `{colors.neutral}` as the page background and reserve Sage Mist and Warm Sand for alternating bands.
- Do use `{colors.tertiary}` fill with `{colors.on-surface}` text only for the primary action, and never invert the relationship.
- Do render every button as a fully rounded pill with 16px 24px padding and SweetSansText 700 at 16px.
- Do let photography fill its container edge-to-edge at 20px radius — no frames, borders or overlays.
- Do apply positive letter-spacing (0.01–0.05em) to all text below 24px.
- Don't use more than one accent color; the palette is one lime and one forest green.
- Don't set headlines at weight 700 or above — authority comes from calm weight 400 at large sizes.
- Don't add backgrounds, borders or shadows to product cards — the photograph is the card.
- Don't use lime for anything but primary CTA fills and availability badges.
- Don't exceed 1.0 line-height on display type.
- Don't apply gradients — the system is flat color warmed by the canvas and saturated photography.
