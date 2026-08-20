---
type: WorkspaceDesign
version: 1
clone_reference: styles.refero.design/style/47f15da7-8905-45b3-bcab-06a4277c6168
template: ehtiger
vertical: food-beverage-condiments
language: en
---

# Hungry Tiger — Fire-Roasted Condiments Design System (DESIGN.md)

## Brand Identity
- **Name**: Hungry Tiger Condiments
- **Vibe**: Turmeric-bright graffiti on a tandoor wall. A single gold-on-rust palette with display type so large it reads as a spice market sign. Bold, warm, maximalist typographic poster.

## Colors
```yaml
colors:
  primary: "#faae33"         # Tiger Gold (Primary Action / Display Text)
  primaryHover: "#f5a019"
  secondary: "#823513"       # Ember Rust (Dominant Page Canvas)
  tertiary: "#9f531b"        # Saffron Glow
  background: "#823513"      # Deep Tandoor Canvas
  surface: "#402011"         # Dark Spice Card Surface
  text: "#faae33"            # Tiger Gold Main Text
  muted: "#9f531b"           # Saffron Glow Muted Text
  border: "#6b2e12"          # Cardamom Brown Hairline Border
  charred: "#281006"         # Charred Clove Deepest Surface
  chili: "#d1255c"           # Chili Red Alert Accent
```

## Typography
```yaml
typography:
  fontHeading: "Antonio"
  fontBody: "Inter"
  headingWeight: "700"
  bodyWeight: "500"
  scale:
    display:  { size: 195, weight: 700, lineHeight: 0.82, tracking: -0.02, transform: "uppercase" }
    h1:       { size: 101, weight: 700, lineHeight: 0.90, tracking: -0.016, transform: "uppercase" }
    h2:       { size: 65,  weight: 700, lineHeight: 0.95, tracking: -0.01,  transform: "uppercase" }
    h3:       { size: 29,  weight: 700, lineHeight: 1.10, tracking: -0.005, transform: "uppercase" }
    body:     { size: 14,  weight: 500, lineHeight: 1.40, tracking: 0 }
    caption:  { size: 11,  weight: 600, lineHeight: 1.20, tracking: 0.02,  transform: "uppercase" }
    eyebrow:  { size: 11,  weight: 700, lineHeight: 1.00, tracking: 0.14,  transform: "uppercase" }
```

## Spacing + Grid
```yaml
spacing:
  section_v: 80px
  section_v_mobile: 48px
  container: 1440px
  gutter: 24px
  card_gap: 20px

grid:
  columns: 12
  product_cols: 3
  product_cols_mobile: 1
```

## Shape + Surface
```yaml
rounded:
  card: 6px           # Clean 6px tight spice cards
  button: 9999px      # Full 9999px pill buttons
  badge: 9999px       # Full pill badges
  input: 9999px       # Full pill inputs
  image: 0px          # Raw product images (no card framing)

surfaces:
  card_surface:
    background: "#402011"
    border: "1px solid #6b2e12"
  section_canvas:
    background: "#823513"
  modal_surface:
    background: "#281006"
```

## Sections Manifest
```yaml
sections:
  - id: sec_01_announcement
    type: announcement_bar
    contract:
      bg: "#281006"
      text_color: "#faae33"
      font_size: "11px"
      letter_spacing: "0.14em"
    props:
      text: "FIRE ROASTED CONDIMENTS · FREE SHIPPING ON ORDERS OVER $45 · DROP 04 LIVE"

  - id: sec_02_header
    type: header_nav
    variant: transparent_pills
    contract:
      sticky: false
      bg: "transparent"
      cta_bg: "#faae33"
      cta_text: "#281006"
      cta_shape: "pill"
    props:
      brand_name: "Hungry Tiger"
      nav_links:
        - label: "SAUCE"
          url: "#products"
        - label: "ABOUT"
          url: "#story"
        - label: "RECIPES"
          url: "#recipes"
        - label: "GAME"
          url: "#game"
      cta_label: "BUY NOW"

  - id: sec_03_hero
    type: hero_banner
    contract:
      layout_mode: "poster_stacked"
      bg: "#823513"
      cta_bg: "#faae33"
      cta_text: "#281006"
      cta_shape: "pill"
    props:
      eyebrow: "FIRE ROASTED INDIAN SPICES"
      headline: "BOLD FLAVOR"
      subtitle: "TIKKA MASALA"
      image: "https://images.refero.design/styles/refero.design/image/4bb82077-2c47-41d2-ba95-3b719bf8bf7e.jpg"
      ctaText: "BUY NOW"
      secondaryCtaText: "EXPLORE SPICES ›"
      ctaUrl: "#products"

  - id: sec_04_divider_1
    type: divider_strip
    contract:
      border_style: "dotted"
      border_color: "#faae33"
      border_width: "1px"

  - id: sec_05_products
    type: product_grid
    contract:
      bg: "#823513"
      gap: "24px"
      card_bg: "#402011"
      card_border: "1px solid #6b2e12"
      card_radius: "6px"
      hover_zoom: 1.04
    props:
      title: "FIRE ROASTED LINEUP"
      subtitle: "Hand-crafted in small batches with single-origin spices and cold-pressed mustard oil."
      items:
        - title: "TIKKA MASALA SAUCE"
          description: "Smoky tandoori tomatoes simmered with fenugreek and roasted aromatics."
          price: 14
          badge: "BESTSELLER"
          image: "https://images.refero.design/styles/refero.design/image/4bb82077-2c47-41d2-ba95-3b719bf8bf7e.jpg"
          ctaText: "ADD TO CART"
        - title: "VINDALOO FIRE DRIZZLE"
          description: "Goan Kashmiri chili reduction with barrel-aged palm vinegar and garlic."
          price: 16
          badge: "EXTRA HOT"
          image: "https://images.refero.design/styles/refero.design/image/4bb82077-2c47-41d2-ba95-3b719bf8bf7e.jpg"
          ctaText: "ADD TO CART"
        - title: "SAFFRON CARDAMOM CHUTNEY"
          description: "Slow-caramelized mango pulp laced with whole green cardamom pods."
          price: 15
          badge: "SEASONAL"
          image: "https://images.refero.design/styles/refero.design/image/4bb82077-2c47-41d2-ba95-3b719bf8bf7e.jpg"
          ctaText: "ADD TO CART"

  - id: sec_06_divider_2
    type: divider_strip
    contract:
      border_style: "dotted"
      border_color: "#faae33"
      border_width: "1px"

  - id: sec_07_story
    type: story_banner
    contract:
      bg: "#402011"
      text_color: "#faae33"
    props:
      title: "ANCIENT SPICE. MODERN FIRE."
      subtitle: "We reject timid condiments. Every jar is packed with whole toasted pods, crushed seeds, and pure tandoor character."
      highlights:
        - "100% Single-Origin Indian Spices"
        - "Zero Preservatives, Artificial Gums, or Cane Sugar"
        - "Slow Fire-Roasted in Small Kettle Batches"
      image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=800&fit=crop"

  - id: sec_08_footer
    type: footer_strip
    contract:
      bg: "#281006"
      text_color: "#faae33"
    props:
      brand_name: "Hungry Tiger"
      text: "© 2026 Hungry Tiger Inc. All Rights Reserved."
```
