/**
 * tarsite — Embedded Built-In Design Templates
 * Provides instant fallback access to standard template Markdown definitions
 * ensuring edge workers never fail when R2 THEMES_BUCKET is empty or unreachable.
 */

export const BUILTIN_TEMPLATES: Record<string, string> = {
  milo: `---
type: WorkspaceDesign
version: 1
template: milo
vertical: cafe-wellness
---
# Milo Pet Care & Insurance Design System (DESIGN.md)

## Colors
\`\`\`yaml
colors:
  primary: "#1FCB60"
  primaryHover: "#1BB154"
  secondary: "#032E1C"
  tertiary: "#B5EB79"
  background: "#FAF7F2"
  surface: "#FFFFFF"
  text: "#032E1C"
  muted: "#64748B"
  border: "rgba(3,46,28,0.08)"
\`\`\`

## Typography
\`\`\`yaml
typography:
  fontHeading: "Marcellus"
  fontBody: "Montserrat"
  headingWeight: "700"
  bodyWeight: "400"
\`\`\`

## Sections Manifest
\`\`\`yaml
sections:
  - id: sec_01_announcement
    type: announcement_bar
    contract:
      bg: "#032E1C"
      color: "#1FCB60"
      font_size: "11px"
    props:
      text: "100% VET EXPENSE REIMBURSEMENT | DIGITAL PET INSURANCE | NO HIDDEN FEES"

  - id: sec_02_header
    type: header_nav
    variant: milo-glass-header
    contract:
      height: "64px"
      bg: "rgba(250,247,242,0.9)"
      button_shape: "pill"
    props:
      brand_name: "milo."
      cta_label: "Get Your Price 🐾"

  - id: sec_03_hero
    type: media_hero
    variant: milo-split-hero
    contract:
      layout_mode: "split"
      cta_bg: "#1FCB60"
      cta_text: "#ffffff"
    props:
      badge: "COMPREHENSIVE PET HEALTH INSURANCE"
      headline: "Reinventing pet insurance with instant claims."
      subtitle: "Simple, transparent protection that pays you back in minutes without paperwork."
      ctaText: "Get Instant Quote"
      image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&h=800&fit=crop"

  - id: sec_04_features
    type: content_grid
    variant: milo-feature-cards
    contract:
      columns: 4
      gap: "24px"
      card_radius: "20px"
      card_bg: "#FFFFFF"
    props:
      title: "Everything your best friend deserves."
      subtitle: "Comprehensive health coverage built for modern pet parents."
      items:
        - title: "Direct Vet Pay"
          description: "We settle eligible bills directly with your clinic."
          image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=450&fit=crop"
        - title: "Zero Waiting Period"
          description: "Accident coverage begins the instant you enroll."
          image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600&h=450&fit=crop"
        - title: "24/7 Telehealth"
          description: "Unlimited video chats with licensed veterinary experts."
          image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=450&fit=crop"
        - title: "Dental & Wellness"
          description: "Routine checkups, cleanings, and preventive vaccines covered."
          image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=450&fit=crop"

  - id: sec_05_checklist
    type: story_banner
    variant: milo-dark-checklist
    contract:
      bg: "#032E1C"
      text_color: "#FFFFFF"
    props:
      title: "Built by veterinarians and pet lovers."
      subtitle: "Designed from day one to eliminate surprise hospital bills."
      highlights:
        - "Up to 90% reimbursement on unexpected vet fees"
        - "Use any licensed veterinarian or emergency hospital"
        - "Direct claim submissions in under 60 seconds"
      image: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=800&h=800&fit=crop"

  - id: sec_06_footer
    type: footer_strip
    variant: milo-footer
    props:
      text: "© 2026 MILO PET CARE INC. ALL RIGHTS RESERVED."
\`\`\`
`,

  kith: `---
type: WorkspaceDesign
version: 1
template: kith
vertical: luxury-streetwear
---
# KITH Streetwear & Lifestyle Design System (DESIGN.md)

## Colors
\`\`\`yaml
colors:
  primary: "#000000"
  primaryHover: "#111111"
  background: "#FFFFFF"
  surface: "#F5F5F5"
  text: "#000000"
  muted: "#999999"
  border: "rgba(0,0,0,0.1)"
  secondary: "#E5E5E5"
\`\`\`

## Typography
\`\`\`yaml
typography:
  fontHeading: "Inter"
  fontBody: "Inter"
  headingWeight: "700"
  bodyWeight: "400"
\`\`\`

## Sections Manifest
\`\`\`yaml
sections:
  - id: sec_01_announcement
    type: announcement_bar
    contract:
      bg: "#000000"
      color: "#FFFFFF"
    props:
      text: "COMPLIMENTARY DOMESTIC EXPRESS SHIPPING ON ORDERS OVER $200"

  - id: sec_02_header
    type: header_nav
    variant: kith-nav
    contract:
      bg: "#FFFFFF"
      height: "60px"
    props:
      brand_name: "KITH"
      cta_label: "SHOP NOW"

  - id: sec_03_hero
    type: poster
    variant: kith-lookbook-hero
    contract:
      height: "80vh"
      bg: "#000000"
    props:
      badge: "SUMMER 2026 EDITORIAL"
      headline: "KITH SUMMER 2026 COLLECTION"
      subtitle: "A multidimensional capsule featuring lightweight linen, silks, and footwear."
      ctaText: "EXPLORE LOOKBOOK"
      image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1000&h=800&fit=crop"

  - id: sec_04_products
    type: product_grid
    variant: kith-product-catalog
    contract:
      columns: 4
      gap: "16px"
      card_radius: "0px"
      card_bg: "#F5F5F5"
    props:
      title: "FEATURED RELEASES"
      subtitle: "Tailored silhouettes and premium seasonal footwear."
      items:
        - title: "Silk Resort Shirt"
          price: 195
          image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=800&fit=crop"
        - title: "Pleated Linen Trouser"
          price: 245
          image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=800&fit=crop"
        - title: "Monochrome Low Runner"
          price: 220
          image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop"
        - title: "Structured Canvas Tote"
          price: 165
          image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=800&fit=crop"

  - id: sec_05_story
    type: story_banner
    variant: kith-editorial-strip
    contract:
      bg: "#111111"
      text_color: "#FFFFFF"
    props:
      title: "A MULTI-DISCIPLINARY LIFESTYLE BRAND"
      subtitle: "Established 2011 in New York City."
      highlights:
        - "Flagship stores across New York, Paris, Tokyo & London"
        - "Exclusive curated global brand partnerships"
        - "Precision Japanese textiles and Italian craftsmanship"
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop"

  - id: sec_06_footer
    type: footer_strip
    variant: kith-footer
    props:
      text: "© 2026 KITH NYC LLC. ALL RIGHTS RESERVED."
\`\`\`
`,

  eql: `---
preset_name: EQL High-Demand Launch Platform
template: eql

tokens:
  color_bg: "#F9F9FB"
  color_surface: "#FFFFFF"
  color_primary: "#0A0A0C"
  color_secondary: "#FFE600"
  color_accent: "#FFF6C7"
  color_text: "#0A0A0C"
  color_muted: "rgba(10, 10, 12, 0.65)"
  color_border: "rgba(10, 10, 12, 0.12)"
  font_heading: "Plus Jakarta Sans"
  font_body: "Inter"

routes:
  "/":
    title: "EQL | Power Fair, High-Demand Product Drops & Launches"
    sections:
      - type: marquee_strip
        variant: launch_ticker
        contract:
          bg: "#0A0A0C"
          text_color: "#FFE600"
          font_size: "11px"
        props:
          text: "THIS LAUNCH IS RUN FAIR® · POWERING HIGH-DEMAND LAUNCHES · ZERO BOTS · CERTIFIED BOT-FREE PRODUCT DROPS"

      - type: navigation_bar
        variant: eql_header
        contract:
          sticky: true
          bg: "rgba(249, 249, 251, 0.94)"
        props:
          brand_name: "EQL"
          cta_label: "CONTACT SALES"

      - type: media_hero
        variant: launch_hero
        contract:
          layout_mode: "split"
          height: "80vh"
          cta_bg: "#0A0A0C"
          cta_text: "#FFFFFF"
        props:
          badge: "TRUSTED BY NIKE · TOPPS · LAPHROAIG · UNDEFEATED"
          headline: "Fueling fandom and growth with every launch."
          subtitle: "EQL helps brands run secure, bot-free, fair launches for high-demand sneakers, trading cards & hype collectibles."
          ctaText: "Explore EQL for Brands"
          secondaryCtaText: "Explore EQL for Fans ›"
          image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&h=800&fit=crop"

      - type: content_grid
        variant: eql_drops
        contract:
          columns: 4
          gap: "20px"
          card_bg: "#FFFFFF"
          card_radius: "12px"
        props:
          title: "RECENT HIGH-HEAT DROPS LAUNCHED ON EQL"
          subtitle: "Discover limited releases verified bot-free with Run Fair® certification."
          items:
            - title: "Air Jordan 1 High OG"
              description: "Certified Bot-Free Launch"
              price: 180
              image: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&h=450&fit=crop"
            - title: "Formula 1 Sealed Box"
              description: "Limited Collector Release"
              price: 350
              image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&h=450&fit=crop"
            - title: "BE@RBRICK 1000% Edition"
              description: "High-Demand Art Drop"
              price: 490
              image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&h=450&fit=crop"
            - title: "Exclusive Green Runner"
              description: "Exclusive Footwear Release"
              price: 210
              image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=450&fit=crop"

      - type: story_banner
        variant: eql_metrics
        contract:
          bg: "#0A0A0C"
          text_color: "#FFE600"
        props:
          title: "PROVEN IMPACT ACROSS 14,000+ LAUNCHES"
          subtitle: "The world's leading platform for bot protection and fair product releases."
          highlights:
            - "14,000+ Verified Launches Completed"
            - "2,000,000+ Automated Bots Blocked"
            - "100% Uptime During Massive Hype Traffic Spikes"
            - "95% Fan Trust and Run Fair® Satisfaction"
          image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=800&fit=crop"

      - type: footer_strip
        variant: eql_footer
        props:
          text: "© 2026 EQL PLATFORM INC. RUN FAIR®."
---
`,

  ehtiger: `---
type: WorkspaceDesign
version: 1
template: ehtiger
vertical: food-beverage-condiments
---
# Hungry Tiger — Fire-Roasted Condiments Design System (DESIGN.md)

## Colors
\`\`\`yaml
colors:
  primary: "#faae33"
  primaryHover: "#f5a019"
  secondary: "#823513"
  tertiary: "#9f531b"
  background: "#823513"
  surface: "#402011"
  text: "#faae33"
  muted: "#9f531b"
  border: "#6b2e12"
\`\`\`

## Typography
\`\`\`yaml
typography:
  fontHeading: "Antonio"
  fontBody: "Inter"
  headingWeight: "700"
  bodyWeight: "500"
\`\`\`

## Sections Manifest
\`\`\`yaml
sections:
  - id: sec_01_announcement
    type: announcement_bar
    contract:
      bg: "#281006"
      text_color: "#faae33"
    props:
      text: "FIRE ROASTED CONDIMENTS · FREE SHIPPING ON ORDERS OVER $45 · DROP 04 LIVE"

  - id: sec_02_header
    type: header_nav
    contract:
      bg: "#823513"
    props:
      brand_name: "HUNGRY TIGER"
      cta_label: "BUY NOW"

  - id: sec_03_hero
    type: poster
    contract:
      height: "85vh"
      bg: "#823513"
    props:
      eyebrow: "SPICE PANTRY & CONDIMENTS"
      headline: "FIRE-ROASTED CHILI CRISP"
      subtitle: "SERIOUS HEAT. CRISP GARLIC. REAL OIL."
      ctaText: "ORDER JARS"
      image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=800&fit=crop"

  - id: sec_04_products
    type: product_grid
    contract:
      columns: 3
      card_bg: "#402011"
      card_border: "1px solid #6b2e12"
      card_radius: "6px"
    props:
      title: "OUR ARTISANAL PANTRY"
      subtitle: "Handcrafted in small batches with single-origin heritage peppers."
      items:
        - title: "Fire-Roasted Chili Crisp"
          price: 14
          description: "Fermented ghost chilies, crisp shallots, and aromatic spices."
          image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop"
        - title: "Smoked Garlic Pepper Crisp"
          price: 16
          description: "Slow-roasted whole garlic cloves in cold-pressed sesame oil."
          image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop"
        - title: "Szechuan Pepper Blossom Honey"
          price: 18
          description: "Wild mountain honey infused with tingling red peppercorns."
          image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop"

  - id: sec_05_story
    type: story_banner
    contract:
      bg: "#402011"
      text_color: "#faae33"
    props:
      title: "CRAFTED FOR SERIOUS HEAT"
      subtitle: "Zero artificial colors. 100% fire-roasted natural spices."
      highlights:
        - "Direct-trade single-origin heritage peppers"
        - "Cooked low and slow in traditional copper kettles"
        - "Sealed fresh with 9 months shelf life"
      image: "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=800&h=800&fit=crop"

  - id: sec_06_footer
    type: footer_strip
    props:
      text: "© 2026 HUNGRY TIGER CONDIMENTS CO."
\`\`\`
`,

  planhat: `---
type: WorkspaceDesign
version: 1
template: planhat
vertical: tech-editorial
---
# Planhat — Cinematic Monochrome Style Reference (DESIGN.md)

## Colors
\`\`\`yaml
colors:
  primary: "#000000"
  secondary: "#958D7E"
  tertiary: "#E8552B"
  background: "#FFFFFF"
  surface: "#F8F8F7"
  text: "#121211"
  muted: "#575551"
  border: "rgba(0,0,0,0.08)"
\`\`\`

## Typography
\`\`\`yaml
typography:
  fontHeading: "Inter"
  fontBody: "Inter"
  headingWeight: "700"
  bodyWeight: "400"
\`\`\`

## Sections Manifest
\`\`\`yaml
sections:
  - id: sec_01_announcement
    type: announcement_bar
    contract:
      bg: "#000000"
      text_color: "#ffffff"
    props:
      text: "Planhat Platform 2026 Release · Now Live"

  - id: sec_02_header
    type: header_nav
    contract:
      bg: "rgba(255,255,255,0.9)"
      cta_bg: "#000000"
      cta_text: "#ffffff"
    props:
      brand_name: "Planhat"
      cta_label: "Request Demo ›"

  - id: sec_03_hero
    type: hero_banner
    contract:
      layout_mode: "split"
      height: "75vh"
      cta_bg: "#000000"
      cta_text: "#ffffff"
    props:
      badge: "CUSTOMER SUCCESS PLATFORM"
      headline: "The modern operating system for customer success."
      subtitle: "Give your team real-time insights, automated health scores, and collaborative playbooks in one unified canvas."
      ctaText: "Start Free Trial"
      secondaryCtaText: "Book Demo ›"
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1000&h=800&fit=crop"

  - id: sec_04_features
    type: product_grid
    contract:
      columns: 3
      gap: "24px"
      card_bg: "#FFFFFF"
      card_radius: "4px"
    props:
      title: "Engineered for Clarity & Scale"
      subtitle: "Everything you need to deliver world-class client retention."
      items:
        - title: "Unified Data Canvas"
          description: "Connect product usage, billing, and CRM into one real-time customer profile."
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=450&fit=crop"
        - title: "Automated Playbooks"
          description: "Trigger proactive workflows when customer engagement signals risk or opportunity."
          image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=450&fit=crop"
        - title: "Executive Revenue Portal"
          description: "Forecast renewals, NRR growth, and expansion revenue with board-ready dashboards."
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=450&fit=crop"

  - id: sec_05_story
    type: story_banner
    contract:
      bg: "#121211"
      text_color: "#FFFFFF"
    props:
      title: "Trusted by Modern SaaS Leaders"
      subtitle: "From high-growth scaleups to enterprise teams managing millions in ARR."
      highlights:
        - "SOC2 Type II and GDPR compliant"
        - "Sub-100ms real-time metric updates"
        - "Native Salesforce, HubSpot & Snowflake integrations"
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=800&fit=crop"

  - id: sec_06_footer
    type: footer_strip
    props:
      text: "© 2026 Planhat Inc. All Rights Reserved."
\`\`\`
`,

  joandso: `---
preset_name: JO&SO Boutique Hotel Guide
template: joandso

tokens:
  color_bg: "#FAF7F2"
  color_surface: "#FFFFFF"
  color_primary: "#2C2523"
  color_secondary: "#B57D14"
  color_accent: "#173577"
  color_text: "#2C2523"
  color_muted: "rgba(44, 37, 35, 0.65)"
  color_border: "rgba(44, 37, 35, 0.12)"
  font_heading: "Playfair Display"
  font_body: "Inter"

routes:
  "/":
    title: "JO&SO | Cool Boutique Hotels in Portugal Handpicked by Two Sisters"
    sections:
      - type: marquee_strip
        variant: warm_ticker
        contract:
          bg: "#2C2523"
          text_color: "#FAF7F2"
          font_size: "11px"
        props:
          text: "JO&SO INSIDER GUIDE · HANDPICKED BOUTIQUE HOTELS IN PORTUGAL · LISBON · PORTO · ALGARVE · COMPORTA · AZORES"

      - type: navigation_bar
        variant: joandso_header
        contract:
          sticky: true
          bg: "rgba(250, 247, 242, 0.94)"
        props:
          brand_name: "JO & SO"
          cta_label: "Search Stays"

      - type: media_hero
        variant: warm_editorial
        contract:
          layout_mode: "split"
          height: "75vh"
          cta_bg: "#2C2523"
          cta_text: "#FFFFFF"
        props:
          badge: "INSIDER PORTUGAL HOTEL GUIDE"
          headline: "The cool hotels in Portugal handpicked by two sisters."
          subtitle: "Discover curated boutique stays, rural farmhouses, and design hideaways across Lisbon, Porto, Algarve, Comporta & beyond."
          ctaText: "Explore All Hotels ›"
          secondaryCtaText: "Browse By Region"
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=800&fit=crop"

      - type: content_grid
        variant: joandso_regions
        contract:
          columns: 4
          gap: "20px"
          card_bg: "#FFFFFF"
          card_radius: "12px"
        props:
          title: "Boutique Hotels in Portugal by Region"
          subtitle: "Explore our personal recommendations for the best stays across Portugal's unique landscapes."
          items:
            - title: "Boutique Stays in Lisbon"
              description: "Romantic cobblestone lanes, lively café culture & rooftop views."
              image: "https://images.unsplash.com/photo-1513688275180-84220161440b?w=600&h=450&fit=crop"
            - title: "Boutique Stays in Porto"
              description: "Historic riverfront hills, Port wine cellars & Douro views."
              image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=450&fit=crop"
            - title: "Boutique Stays in Algarve"
              description: "Golden limestone cliffs, turquoise coves & citrus orchards."
              image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop"
            - title: "Boutique Stays in Alentejo"
              description: "Whitewashed sleepy villages, cork groves & wild empty beaches."
              image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&h=450&fit=crop"

      - type: story_banner
        variant: joandso_story
        contract:
          bg: "#2C2523"
          text_color: "#FAF7F2"
        props:
          title: "HANDPICKED BY TWO SISTERS."
          subtitle: "We personally scout, photograph, and test every boutique hotel and farmhouse before recommending it."
          highlights:
            - "100% Unbiased & Independent Sister-Curated Selection"
            - "Exclusive Per-Stay Perks & Direct Booking Rates"
            - "Local Insider Guides to Hidden Restaurants & Secret Coves"
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=800&fit=crop"

      - type: footer_strip
        variant: joandso_footer
        props:
          text: "© 2026 JO&SO BOUTIQUE TRAVEL LTD. ALL RIGHTS RESERVED."
---
`,

  empire: `---
preset_name: EMPIRE Global Music Label
template: empire

tokens:
  color_bg: "#000000"
  color_surface: "#0A0A0A"
  color_primary: "#FFFFFF"
  color_secondary: "#1A1A1A"
  color_accent: "#E50914"
  color_text: "#FFFFFF"
  color_muted: "rgba(255, 255, 255, 0.65)"
  color_border: "rgba(255, 255, 255, 0.12)"
  font_heading: "Inter Tight"
  font_body: "Inter"

routes:
  "/":
    title: "EMPIRE – Independent Label & Global Music Publisher"
    sections:
      - type: marquee_strip
        variant: black_ticker
        contract:
          bg: "#000000"
          text_color: "#E50914"
          font_size: "11px"
        props:
          text: "EMPIRE PUBLISHING · GLOBAL MUSIC DISTRIBUTION · HIP-HOP / AFROBEATS / LATIN / R&B · INDEPENDENT FOREVER"

      - type: navigation_bar
        variant: empire_header
        contract:
          sticky: true
          bg: "rgba(0, 0, 0, 0.92)"
        props:
          brand_name: "EMPIRE"
          cta_label: "SUBMIT DEMO"

      - type: media_hero
        variant: cinematic_dark
        contract:
          layout_mode: "overlay"
          height: "85vh"
          cta_bg: "#FFFFFF"
          cta_text: "#000000"
        props:
          badge: "INDEPENDENT LABEL & GLOBAL PUBLISHER"
          headline: "ELEVATING GLOBAL MUSIC TALENT."
          subtitle: "Direct-to-DSP distribution, sync licensing, and financial transparency for independent artists worldwide."
          ctaText: "EXPLORE ROSTER"
          secondaryCtaText: "PUBLISHING ADMIN ›"
          image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1920&h=1080&fit=crop"

      - type: content_grid
        variant: empire_roster
        contract:
          columns: 4
          gap: "20px"
          card_bg: "#0A0A0A"
          card_radius: "0px"
        props:
          title: "FEATURED RELEASES & ARTISTS"
          subtitle: "Global chart-topping independent music across Hip-Hop, Afrobeats, Latin, and R&B."
          items:
            - title: "Afrobeats Global Hits"
              description: "Worldwide Digital Distribution"
              image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=800&fit=crop"
            - title: "Hip-Hop Heavyweights"
              description: "Chart-Topping Releases"
              image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop"
            - title: "Latin & R&B Roster"
              description: "Direct DSP Sync Publishing"
              image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop"
            - title: "Global Sync Catalog"
              description: "Film, TV & Commercials"
              image: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=800&h=800&fit=crop"

      - type: story_banner
        variant: empire_story
        contract:
          bg: "#050505"
          text_color: "#FFFFFF"
        props:
          title: "THE FUTURE OF INDEPENDENT MUSIC."
          subtitle: "EMPIRE empowers creators with global DSP delivery, international sync administration, and transparent real-time royalties."
          highlights:
            - "100% Master Ownership & Creative Control"
            - "Direct DSP Distribution across Spotify, Apple, TikTok & YouTube"
            - "International Sync Licensing & Publishing Admin"
          image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=800&fit=crop"

      - type: footer_strip
        variant: empire_footer
        props:
          text: "© 2026 EMPIRE Distribution, Records & Publishing Inc. All rights reserved."
---
`,
};

export function getBuiltinTemplateMd(template: string): string | null {
  const norm = (template || '').toLowerCase().trim();
  return BUILTIN_TEMPLATES[norm] || null;
}
