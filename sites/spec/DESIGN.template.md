---
version: alpha
name: Your Brand
description: One line describing the product, audience and the feeling the UI should evoke.

colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
  surface: "#FFFFFF"
  on-surface: "#1A1C1E"
  error: "#B42318"

typography:
  display:
    fontFamily: Public Sans
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.02em
  heading:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.08em

rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px

spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  gutter: 24px
  margin: 32px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.full}"
    padding: 14px 24px
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
---

# Your Brand

## Overview

Describe the brand personality, the audience and the emotional response the UI should evoke — playful or professional, dense or spacious, calm or urgent. This is the fallback the agent uses when no specific token or rule applies. Keep it to a short paragraph and one or two sentences of direction.

## Colors

State the palette logic in plain language: which single color drives interaction, which anchors structure, which is the canvas. Reference tokens by name.

- **Primary (`{colors.primary}`):** the anchor for text, structure and the primary surface.
- **Secondary (`{colors.secondary}`):** supporting and utilitarian elements such as borders and metadata.
- **Tertiary (`{colors.tertiary}`):** the single interaction accent, reserved for primary actions.
- **Neutral (`{colors.neutral}`):** the base canvas.

Never introduce an accent that is not defined here.

## Typography

Describe the type strategy: which family carries voice, which carries data, and the size/weight relationship that makes it distinctive.

- **Display:** the largest headline style and its role.
- **Heading:** section-level hierarchy.
- **Body:** long-form readability.
- **Label:** metadata and small caps.

## Layout

Describe the grid model (fluid or fixed), the spacing rhythm, the maximum content width and how sections are contained (cards, bands, full-bleed).

## Elevation & Depth

Explain how hierarchy is conveyed — tonal layers, borders, or shadows. If the system is flat, say what replaces shadow.

## Shapes

State the shape language and when each radius is used. Name the one radius that defines interactive elements.

## Components

Give short style guidance for the atoms the catalog uses:

- **Buttons:** primary, secondary and tertiary variants, sizing and states.
- **Inputs:** fields, labels, helper text and error states.
- **Cards:** surface, padding and interaction.
- **Chips / Tabs:** selection and filter states.
- **Lists:** items, dividers and leading/trailing elements.

## Do's and Don'ts

- Do use the interaction accent only for the single most important action per screen.
- Do maintain WCAG AA contrast (4.5:1 for normal text).
- Don't mix shape languages in one view.
- Don't use more than two font weights on a single screen.
- Don't invent colors, radii or spacing outside these tokens.
