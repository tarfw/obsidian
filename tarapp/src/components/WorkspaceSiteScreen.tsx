import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TarLogoLoader } from './TarLogoLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { useSite } from '@/hooks/use-site';

export interface ThemeSectionSpec {
  id: string;
  type: string;
  variant: string;
  label: string;
  contract: {
    bg?: string;
    color?: string;
    textColor?: string;
    fontSize?: string;
    height?: string;
    columns?: number;
    gap?: string;
    cardRadius?: string;
    buttonShape?: 'pill' | 'sharp' | 'rounded';
    layout?: string;
    logo?: string;
    [key: string]: any;
  };
  props?: {
    headline?: string;
    subtitle?: string;
    badge?: string;
    ctaText?: string;
    text?: string;
    brandName?: string;
    items?: string[];
    [key: string]: any;
  };
}

export interface ThemePresetDetail {
  id: string;
  name: string;
  vibe: string;
  category: string;
  bg: string;
  accent: string;
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
  };
  typography: {
    fontHeading: string;
    fontBody: string;
    headingWeight: string;
    bodyWeight: string;
    transform?: string;
    scale: {
      display: string;
      h1: string;
      h2: string;
      h3: string;
      body: string;
      caption: string;
      eyebrow: string;
    };
  };
  shape: {
    cardRadius: string;
    buttonRadius: string;
    tagRadius: string;
    buttonStyle: string;
  };
  spacing: {
    container: string;
    sectionV: string;
    columns: number;
    productCols: number;
    cardGap: string;
  };
  sections: ThemeSectionSpec[];
}

export const THEME_PRESETS: ThemePresetDetail[] = [
  {
    id: 'milo',
    name: 'Milo Fresh',
    vibe: 'Clean Botanical · Earthy Green',
    category: 'Cafe / Wellness',
    bg: '#032E1C',
    accent: '#1FCB60',
    colors: {
      primary: '#1FCB60',
      secondary: '#032E1C',
      tertiary: '#B5EB79',
      background: '#FAF7F2',
      surface: '#FFFFFF',
      text: '#032E1C',
      muted: '#64748B',
      border: 'rgba(3,46,28,0.08)',
    },
    typography: {
      fontHeading: 'Marcellus',
      fontBody: 'Montserrat',
      headingWeight: '700',
      bodyWeight: '400',
      scale: {
        display: '64px / 700',
        h1: '48px / 700',
        h2: '36px / 700',
        h3: '24px / 600',
        body: '16px / 400',
        caption: '13px / 400',
        eyebrow: '11px / 700 (Uppercase)',
      },
    },
    shape: {
      cardRadius: '20px (Soft Pill)',
      buttonRadius: '9999px (Pill)',
      tagRadius: '9999px',
      buttonStyle: 'Green Full Pill',
    },
    spacing: {
      container: '1200px',
      sectionV: '80px',
      columns: 12,
      productCols: 4,
      cardGap: '24px',
    },
    sections: [
      {
        id: 'sec_01',
        type: 'announcement_bar',
        variant: 'milo-announcement',
        label: 'Announcement Ticker',
        contract: {
          bg: '#032E1C',
          color: '#1FCB60',
          fontSize: '11px',
          buttonShape: 'pill',
        },
        props: {
          text: '100% VET EXPENSE REIMBURSEMENT | DIGITAL PET CARE | NO HIDDEN FEES',
        },
      },
      {
        id: 'sec_02',
        type: 'header_nav',
        variant: 'milo-glass-header',
        label: 'Glass Navigation Header',
        contract: {
          bg: 'rgba(250,247,242,0.9)',
          height: '64px',
          buttonShape: 'pill',
          logo: 'milo.',
        },
        props: {
          brandName: 'milo.',
          ctaText: 'Get Your Price 🐾',
        },
      },
      {
        id: 'sec_03',
        type: 'hero_banner',
        variant: 'milo-split-hero',
        label: 'Split Media Hero',
        contract: {
          layout: 'split-2col',
          bg: '#FAF7F2',
          buttonShape: 'pill',
        },
        props: {
          badge: 'COMPREHENSIVE PET HEALTH & CARE',
          headline: 'Reinventing pet wellness with instant edge claims.',
          subtitle: 'Simple, transparent protection that pays you back in minutes without paperwork.',
          ctaText: 'Get Instant Quote',
        },
      },
      {
        id: 'sec_04',
        type: 'product_grid',
        variant: 'milo-feature-cards',
        label: 'Product & Features Grid',
        contract: {
          columns: 4,
          gap: '24px',
          cardRadius: '20px',
          bg: '#FFFFFF',
        },
        props: {
          headline: 'Everything your best friend deserves.',
          items: ['Direct Vet Pay', 'Zero Waiting Period', '24/7 Telehealth', 'Dental & Wellness'],
        },
      },
      {
        id: 'sec_05',
        type: 'story_banner',
        variant: 'milo-dark-checklist',
        label: 'Brand Story & Checklist',
        contract: {
          bg: '#032E1C',
          textColor: '#FFFFFF',
          layout: 'checklist-split',
        },
        props: {
          headline: 'Built by veterinarians and animal lovers.',
          subtitle: 'Designed from day one to remove surprise clinic bills.',
        },
      },
      {
        id: 'sec_06',
        type: 'footer_strip',
        variant: 'milo-footer',
        label: 'Footer Strip',
        contract: {
          bg: '#032E1C',
          textColor: '#FAF7F2',
        },
        props: {
          text: '© 2026 MILO PET CARE INC. ALL RIGHTS RESERVED.',
        },
      },
    ],
  },
  {
    id: 'kith',
    name: 'Kith Modern',
    vibe: 'Luxury Monochrome · Sharp Boxy',
    category: 'Streetwear / Retail',
    bg: '#111111',
    accent: '#FFFFFF',
    colors: {
      primary: '#000000',
      secondary: '#E5E5E5',
      tertiary: '#111111',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#000000',
      muted: '#999999',
      border: 'rgba(0,0,0,0.1)',
    },
    typography: {
      fontHeading: 'Inter',
      fontBody: 'Inter',
      headingWeight: '700',
      bodyWeight: '400',
      transform: 'UPPERCASE',
      scale: {
        display: '88px / 700 (Uppercase)',
        h1: '56px / 700 (Uppercase)',
        h2: '36px / 700 (Uppercase)',
        h3: '24px / 600 (Uppercase)',
        body: '15px / 400',
        caption: '12px / 400',
        eyebrow: '11px / 600 (Uppercase)',
      },
    },
    shape: {
      cardRadius: '0px (Sharp Boxy)',
      buttonRadius: '0px (Sharp)',
      tagRadius: '0px',
      buttonStyle: 'Sharp Monochrome Rectangle',
    },
    spacing: {
      container: '1440px',
      sectionV: '80px',
      columns: 12,
      productCols: 4,
      cardGap: '16px',
    },
    sections: [
      {
        id: 'sec_01',
        type: 'announcement_bar',
        variant: 'kith-announcement',
        label: 'Announcement Ticker',
        contract: {
          bg: '#000000',
          color: '#FFFFFF',
          fontSize: '11px',
          buttonShape: 'sharp',
        },
        props: {
          text: 'COMPLIMENTARY DOMESTIC EXPRESS SHIPPING ON ORDERS OVER $200',
        },
      },
      {
        id: 'sec_02',
        type: 'header_nav',
        variant: 'kith-nav',
        label: 'Monochrome Header',
        contract: {
          bg: '#FFFFFF',
          height: '60px',
          buttonShape: 'sharp',
          logo: 'KITH',
        },
        props: {
          brandName: 'KITH',
          ctaText: 'SHOP COLLECTION',
        },
      },
      {
        id: 'sec_03',
        type: 'hero_banner',
        variant: 'kith-lookbook-hero',
        label: 'Editorial Lookbook Hero',
        contract: {
          layout: 'full-bleed',
          bg: '#000000',
          buttonShape: 'sharp',
        },
        props: {
          badge: 'SUMMER 2026 EDITORIAL',
          headline: 'KITH SUMMER 2026 COLLECTION',
          subtitle: 'A multidimensional capsule featuring lightweight linen, silks, and footwear.',
          ctaText: 'EXPLORE LOOKBOOK',
        },
      },
      {
        id: 'sec_04',
        type: 'product_grid',
        variant: 'kith-product-catalog',
        label: 'Sharp Product Catalog',
        contract: {
          columns: 4,
          gap: '16px',
          cardRadius: '0px',
          bg: '#F5F5F5',
        },
        props: {
          headline: 'FEATURED RELEASES',
          items: ['Outerwear', 'Tailoring', 'Footwear', 'Accessories'],
        },
      },
      {
        id: 'sec_05',
        type: 'story_banner',
        variant: 'kith-editorial-strip',
        label: 'Brand Editorial Strip',
        contract: {
          bg: '#111111',
          textColor: '#FFFFFF',
          layout: 'monochrome-editorial',
        },
        props: {
          headline: 'A MULTI-DISCIPLINARY LIFESTYLE BRAND',
          subtitle: 'Established 2011 in New York City.',
        },
      },
      {
        id: 'sec_06',
        type: 'footer_strip',
        variant: 'kith-footer',
        label: 'Monochrome Footer',
        contract: {
          bg: '#000000',
          textColor: '#999999',
        },
        props: {
          text: '© 2026 KITH NYC LLC. ALL RIGHTS RESERVED.',
        },
      },
    ],
  },
  {
    id: 'eql',
    name: 'EQL Launch',
    vibe: 'High-Heat Drops · Bold Badges',
    category: 'Limited Releases',
    bg: '#FFE600',
    accent: '#0A0A0C',
    colors: {
      primary: '#0A0A0C',
      secondary: '#FFE600',
      tertiary: '#FFF6C7',
      background: '#F9F9FB',
      surface: '#FFFFFF',
      text: '#0A0A0C',
      muted: 'rgba(10, 10, 12, 0.65)',
      border: 'rgba(10, 10, 12, 0.12)',
    },
    typography: {
      fontHeading: 'Plus Jakarta Sans',
      fontBody: 'Inter',
      headingWeight: '800',
      bodyWeight: '500',
      scale: {
        display: '80px / 800',
        h1: '52px / 800',
        h2: '36px / 800',
        h3: '24px / 700',
        body: '15px / 500',
        caption: '12px / 500',
        eyebrow: '11px / 800 (Uppercase)',
      },
    },
    shape: {
      cardRadius: '12px (Smooth Rounded)',
      buttonRadius: '9999px (Pill)',
      tagRadius: '9999px',
      buttonStyle: 'High-Heat Yellow Pill',
    },
    spacing: {
      container: '1280px',
      sectionV: '80px',
      columns: 12,
      productCols: 4,
      cardGap: '20px',
    },
    sections: [
      {
        id: 'sec_01',
        type: 'announcement_bar',
        variant: 'launch_ticker',
        label: 'Run Fair® Marquee Ticker',
        contract: {
          bg: '#0A0A0C',
          color: '#FFE600',
          fontSize: '11px',
        },
        props: {
          text: 'THIS LAUNCH IS RUN FAIR® · CERTIFIED BOT-FREE PRODUCT DROPS · EQL PLATFORM',
        },
      },
      {
        id: 'sec_02',
        type: 'header_nav',
        variant: 'eql_header',
        label: 'Navigation Header',
        contract: {
          bg: 'rgba(249, 249, 251, 0.94)',
          height: '64px',
          buttonShape: 'pill',
          logo: 'EQL',
        },
        props: {
          brandName: 'EQL',
          ctaText: 'CONTACT SALES',
        },
      },
      {
        id: 'sec_03',
        type: 'hero_banner',
        variant: 'launch_hero',
        label: 'Split Launch Hero',
        contract: {
          layout: 'split-2col',
          bg: '#F9F9FB',
          buttonShape: 'pill',
        },
        props: {
          badge: 'TRUSTED BY NIKE, TOPPS, UNDEFEATED & LAPHROAIG',
          headline: 'Fueling fandom and growth with every launch.',
          subtitle: 'EQL helps brands run secure, bot-free launches for high-demand sneakers, trading cards & hype collectibles.',
          ctaText: 'Explore EQL for Brands',
        },
      },
      {
        id: 'sec_04',
        type: 'product_grid',
        variant: 'eql_drops',
        label: 'High-Heat Drops Grid',
        contract: {
          columns: 4,
          gap: '20px',
          cardRadius: '12px',
          bg: '#FFFFFF',
        },
        props: {
          headline: 'RECENT HIGH-HEAT DROPS',
          items: ['Air Jordan 1 High OG', 'Topps F1 Sealed Box', 'BE@RBRICK 1000%', 'Tiffany Pikachu Small'],
        },
      },
      {
        id: 'sec_05',
        type: 'story_banner',
        variant: 'eql_nike_quote',
        label: 'Verified Metrics Banner',
        contract: {
          bg: '#0A0A0C',
          textColor: '#FFE600',
        },
        props: {
          headline: '14,000+ Launches · 2M+ Bots Blocked · 100% Edge Uptime',
        },
      },
      {
        id: 'sec_06',
        type: 'footer_strip',
        variant: 'eql_footer',
        label: 'Launch Platform Footer',
        contract: {
          bg: '#0A0A0C',
          textColor: '#FFFFFF',
        },
        props: {
          text: '© 2026 EQL PLATFORM INC. RUN FAIR®.',
        },
      },
    ],
  },
  {
    id: 'ehtiger',
    name: 'Hungry Tiger',
    vibe: 'Warm Bold · Maximalist Spices',
    category: 'Food / Condiments',
    bg: '#823513',
    accent: '#FAAE33',
    colors: {
      primary: '#FAAE33',
      secondary: '#823513',
      tertiary: '#9F531B',
      background: '#823513',
      surface: '#402011',
      text: '#FAAE33',
      muted: '#DDA277',
      border: '#6B2E12',
    },
    typography: {
      fontHeading: 'Antonio',
      fontBody: 'Inter',
      headingWeight: '700',
      bodyWeight: '500',
      scale: {
        display: '72px / 700',
        h1: '48px / 700',
        h2: '32px / 700',
        h3: '22px / 600',
        body: '15px / 500',
        caption: '12px / 500',
        eyebrow: '11px / 700 (Uppercase)',
      },
    },
    shape: {
      cardRadius: '6px (Tactile Corner)',
      buttonRadius: '9999px (Pill)',
      tagRadius: '9999px',
      buttonStyle: 'Mustard Gold Pill',
    },
    spacing: {
      container: '1200px',
      sectionV: '64px',
      columns: 12,
      productCols: 3,
      cardGap: '20px',
    },
    sections: [
      {
        id: 'sec_01',
        type: 'announcement_bar',
        variant: 'tiger-spicy-ticker',
        label: 'Fire-Roasted Ticker',
        contract: { bg: '#402011', color: '#FAAE33', fontSize: '11px' },
        props: { text: 'FIRE-ROASTED CHILI CRISP · 100% ARTISANAL SMALL BATCHES · WORLDWIDE SHIPPING' },
      },
      {
        id: 'sec_02',
        type: 'header_nav',
        variant: 'tiger-nav',
        label: 'Rustic Nav Header',
        contract: { bg: '#823513', height: '64px', buttonShape: 'pill', logo: 'HUNGRY TIGER' },
        props: { brandName: 'HUNGRY TIGER', ctaText: 'ORDER JARS' },
      },
      {
        id: 'sec_03',
        type: 'hero_banner',
        variant: 'tiger-split-hero',
        label: 'Spicy Hero Banner',
        contract: { layout: 'split-2col', bg: '#823513', buttonShape: 'pill' },
        props: {
          badge: 'EST. 2024 · BOLD CONDIMENTS',
          headline: 'Fire-Roasted Condiments Made For Serious Heat.',
          subtitle: 'Fermented chilies, crisp shallots, and aromatic spices cooked low and slow in copper kettles.',
          ctaText: 'Taste The Heat',
        },
      },
      {
        id: 'sec_04',
        type: 'product_grid',
        variant: 'tiger-bottle-grid',
        label: 'Hot Sauce & Crisp Grid',
        contract: { columns: 3, gap: '20px', cardRadius: '6px', bg: '#402011' },
        props: { headline: 'OUR ARTISANAL PANTRY', items: ['Extra Hot Chili Crisp', 'Smoked Garlic Crisp', 'Szechuan Pepper Honey'] },
      },
      {
        id: 'sec_05',
        type: 'footer_strip',
        variant: 'tiger-footer',
        label: 'Rustic Footer',
        contract: { bg: '#402011', textColor: '#FAAE33' },
        props: { text: '© 2026 HUNGRY TIGER CONDIMENTS CO.' },
      },
    ],
  },
  {
    id: 'planhat',
    name: 'Planhat Tech',
    vibe: 'Cinematic Obsidian · Ember Tag',
    category: 'SaaS / Tech',
    bg: '#000000',
    accent: '#E8552B',
    colors: {
      primary: '#000000',
      secondary: '#958D7E',
      tertiary: '#E8552B',
      background: '#FFFFFF',
      surface: '#F8F8F7',
      text: '#121211',
      muted: '#575551',
      border: 'rgba(0,0,0,0.08)',
    },
    typography: {
      fontHeading: 'Inter',
      fontBody: 'Inter',
      headingWeight: '700',
      bodyWeight: '400',
      scale: {
        display: '96px / 700',
        h1: '56px / 700',
        h2: '36px / 700',
        h3: '24px / 600',
        body: '16px / 400',
        caption: '12px / 400',
        eyebrow: '10px / 600 (Uppercase)',
      },
    },
    shape: {
      cardRadius: '4px (Minimal Tech)',
      buttonRadius: '4px (Modern)',
      tagRadius: '999px',
      buttonStyle: 'Obsidian 4px Tight Box',
    },
    spacing: {
      container: '1280px',
      sectionV: '80px',
      columns: 12,
      productCols: 3,
      cardGap: '24px',
    },
    sections: [
      {
        id: 'sec_01',
        type: 'header_nav',
        variant: 'planhat-nav',
        label: 'Minimal Tech Header',
        contract: { bg: '#FFFFFF', height: '64px', buttonShape: 'sharp', logo: 'planhat' },
        props: { brandName: 'planhat', ctaText: 'Request Demo' },
      },
      {
        id: 'sec_02',
        type: 'hero_banner',
        variant: 'planhat-editorial-hero',
        label: 'Cinematic Editorial Hero',
        contract: { layout: 'split-2col', bg: '#FFFFFF', buttonShape: 'sharp' },
        props: {
          badge: 'THE CUSTOMER PLATFORM',
          headline: 'The Customer Platform for Modern Tech.',
          subtitle: 'Unify data, build workflows, and manage customer life cycles with high contrast precision.',
          ctaText: 'Explore Platform',
        },
      },
      {
        id: 'sec_03',
        type: 'product_grid',
        variant: 'planhat-feature-grid',
        label: 'SaaS Feature Modules',
        contract: { columns: 3, gap: '24px', cardRadius: '4px', bg: '#F8F8F7' },
        props: { headline: 'PLATFORM CAPABILITIES', items: ['Unified Data Engine', 'Workflow Automation', 'Revenue Analytics'] },
      },
      {
        id: 'sec_04',
        type: 'footer_strip',
        variant: 'planhat-footer',
        label: 'Tech Editorial Footer',
        contract: { bg: '#121211', textColor: '#FFFFFF' },
        props: { text: '© 2026 PLANHAT AB. ALL RIGHTS RESERVED.' },
      },
    ],
  },
  {
    id: 'joandso',
    name: 'JO & SO',
    vibe: 'Warm Editorial · Taupe & Sand',
    category: 'Boutique / Hotel',
    bg: '#F5F2EB',
    accent: '#2C2A29',
    colors: {
      primary: '#2C2523',
      secondary: '#B57D14',
      tertiary: '#173577',
      background: '#FAF7F2',
      surface: '#FFFFFF',
      text: '#2C2523',
      muted: 'rgba(44, 37, 35, 0.65)',
      border: 'rgba(44, 37, 35, 0.12)',
    },
    typography: {
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
      headingWeight: '700',
      bodyWeight: '400',
      scale: {
        display: '68px / 700',
        h1: '46px / 700',
        h2: '32px / 700',
        h3: '22px / 600',
        body: '15px / 400',
        caption: '12px / 400',
        eyebrow: '11px / 600 (Uppercase)',
      },
    },
    shape: {
      cardRadius: '12px (Soft Editorial)',
      buttonRadius: '9999px (Pill)',
      tagRadius: '9999px',
      buttonStyle: 'Warm Charcoal Pill',
    },
    spacing: {
      container: '1280px',
      sectionV: '75px',
      columns: 12,
      productCols: 4,
      cardGap: '20px',
    },
    sections: [
      {
        id: 'sec_01',
        type: 'announcement_bar',
        variant: 'warm_ticker',
        label: 'Warm Travel Ticker',
        contract: { bg: '#2C2523', color: '#FAF7F2', fontSize: '11px' },
        props: { text: 'JO&SO INSIDER GUIDE · HANDPICKED BOUTIQUE HOTELS IN PORTUGAL · LISBON · PORTO · ALGARVE' },
      },
      {
        id: 'sec_02',
        type: 'header_nav',
        variant: 'joandso_header',
        label: 'Warm Editorial Header',
        contract: { bg: 'rgba(250, 247, 242, 0.94)', height: '64px', buttonShape: 'pill', logo: 'JO & SO' },
        props: { brandName: 'JO & SO', ctaText: 'Search Stays' },
      },
      {
        id: 'sec_03',
        type: 'hero_banner',
        variant: 'warm_editorial',
        label: 'Curated Stay Hero',
        contract: { layout: 'split-2col', bg: '#FAF7F2', buttonShape: 'pill' },
        props: {
          badge: 'INSIDER PORTUGAL HOTEL GUIDE',
          headline: 'The cool hotels in Portugal handpicked by two sisters.',
          subtitle: 'Discover curated boutique stays, rural farmhouses, and design hideaways.',
          ctaText: 'Explore All Hotels',
        },
      },
      {
        id: 'sec_04',
        type: 'product_grid',
        variant: 'joandso_regions',
        label: 'Regional Highlights Grid',
        contract: { columns: 4, gap: '20px', cardRadius: '12px', bg: '#FFFFFF' },
        props: { headline: 'STAYS BY REGION', items: ['Lisbon Cobblestone', 'Porto Riverfront', 'Algarve Cliffs', 'Alentejo Coast'] },
      },
      {
        id: 'sec_05',
        type: 'footer_strip',
        variant: 'joandso_footer',
        label: 'Editorial Footer',
        contract: { bg: '#2C2523', textColor: '#FAF7F2' },
        props: { text: '© 2026 JO&SO BOUTIQUE TRAVEL LTD.' },
      },
    ],
  },
  {
    id: 'empire',
    name: 'EMPIRE Dark',
    vibe: 'Deep Obsidian · Music Label',
    category: 'Creative / Music',
    bg: '#0A0A0C',
    accent: '#E5E7EB',
    colors: {
      primary: '#FFFFFF',
      secondary: '#1A1A1A',
      tertiary: '#E50914',
      background: '#000000',
      surface: '#0A0A0A',
      text: '#FFFFFF',
      muted: 'rgba(255, 255, 255, 0.65)',
      border: 'rgba(255, 255, 255, 0.12)',
    },
    typography: {
      fontHeading: 'Inter Tight',
      fontBody: 'Inter',
      headingWeight: '700',
      bodyWeight: '400',
      scale: {
        display: '80px / 700',
        h1: '52px / 700',
        h2: '36px / 700',
        h3: '24px / 600',
        body: '15px / 400',
        caption: '12px / 400',
        eyebrow: '11px / 700 (Uppercase)',
      },
    },
    shape: {
      cardRadius: '0px (Sharp Square)',
      buttonRadius: '0px (Sharp)',
      tagRadius: '0px',
      buttonStyle: 'Pure White Square Box',
    },
    spacing: {
      container: '1440px',
      sectionV: '80px',
      columns: 12,
      productCols: 4,
      cardGap: '16px',
    },
    sections: [
      {
        id: 'sec_01',
        type: 'announcement_bar',
        variant: 'black_ticker',
        label: 'Black Marquee Ticker',
        contract: { bg: '#000000', color: '#E50914', fontSize: '11px' },
        props: { text: 'EMPIRE PUBLISHING · GLOBAL MUSIC DISTRIBUTION · INDEPENDENT FOREVER' },
      },
      {
        id: 'sec_02',
        type: 'header_nav',
        variant: 'empire_header',
        label: 'Obsidian Nav Header',
        contract: { bg: '#000000', height: '64px', buttonShape: 'sharp', logo: 'EMPIRE' },
        props: { brandName: 'EMPIRE', ctaText: 'SUBMIT DEMO' },
      },
      {
        id: 'sec_03',
        type: 'hero_banner',
        variant: 'cinematic_dark',
        label: 'Cinematic Dark Hero',
        contract: { layout: 'overlay', bg: '#000000', buttonShape: 'sharp' },
        props: {
          badge: 'INDEPENDENT MUSIC PLATFORM',
          headline: 'Independent Label & Global Music Distribution.',
          subtitle: 'Empowering artists with global reach, publishing, and direct distribution.',
          ctaText: 'Explore Releases',
        },
      },
      {
        id: 'sec_04',
        type: 'product_grid',
        variant: 'empire_roster',
        label: 'Artist & Release Grid',
        contract: { columns: 4, gap: '16px', cardRadius: '0px', bg: '#0A0A0A' },
        props: { headline: 'LATEST RELEASES', items: ['Hip-Hop Catalog', 'Latin Hits', 'Afrobeats Spotlight', 'R&B Soul'] },
      },
      {
        id: 'sec_05',
        type: 'footer_strip',
        variant: 'empire_footer',
        label: 'Deep Obsidian Footer',
        contract: { bg: '#0A0A0A', textColor: '#FFFFFF' },
        props: { text: '© 2026 EMPIRE DISTRIBUTION & PUBLISHING INC.' },
      },
    ],
  },
];

const AI_SUGGESTIONS = [
  'Change hero headline to Summer Artisanal Collection',
  'Add a 20% discount announcement bar on top',
  'Switch product grid to 4 columns',
  'Make the background warmer taupe',
];

interface WorkspaceSiteScreenProps {
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  subdomain: string;
  scope: string;
  products?: any[];
}

/**
 * Visual structural wireframe graphic illustration for sections
 */
function SectionWireframe({
  section,
  themeAccent,
  themeBg,
}: {
  section: ThemeSectionSpec;
  themeAccent: string;
  themeBg: string;
}) {
  const type = section.type;

  if (type === 'announcement_bar' || type === 'marquee_strip') {
    return (
      <View style={wireframeStyles.wireframeBox}>
        <View style={[wireframeStyles.tickerWireframe, { backgroundColor: '#09090b' }]}>
          <View style={[wireframeStyles.wireframeDot, { backgroundColor: themeAccent }]} />
          <View style={wireframeStyles.wireframeLineWide} />
          <View style={[wireframeStyles.wireframeDot, { backgroundColor: themeAccent }]} />
          <View style={wireframeStyles.wireframeLineShort} />
        </View>
      </View>
    );
  }

  if (type === 'header_nav' || type === 'navigation_bar') {
    const isPill = section.contract?.buttonShape === 'pill';
    return (
      <View style={wireframeStyles.wireframeBox}>
        <View style={wireframeStyles.headerNavWireframe}>
          <View style={wireframeStyles.logoWireframe} />
          <View style={wireframeStyles.navLinksWireframe}>
            <View style={wireframeStyles.navLinkLine} />
            <View style={wireframeStyles.navLinkLine} />
            <View style={wireframeStyles.navLinkLine} />
          </View>
          <View
            style={[
              wireframeStyles.ctaButtonWireframe,
              {
                borderRadius: isPill ? 10 : 2,
                backgroundColor: themeAccent,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  if (type === 'hero_banner' || type === 'media_hero') {
    const isPill = section.contract?.buttonShape === 'pill';
    return (
      <View style={wireframeStyles.wireframeBox}>
        <View style={wireframeStyles.heroWireframe}>
          {/* Left Text Column */}
          <View style={wireframeStyles.heroLeftCol}>
            <View style={[wireframeStyles.badgeWireframe, { backgroundColor: themeAccent + '30' }]} />
            <View style={wireframeStyles.heroHeadlineLine1} />
            <View style={wireframeStyles.heroHeadlineLine2} />
            <View style={wireframeStyles.heroSubline} />
            <View
              style={[
                wireframeStyles.heroCtaBtn,
                {
                  borderRadius: isPill ? 10 : 2,
                  backgroundColor: themeAccent,
                },
              ]}
            />
          </View>

          {/* Right Media Placeholder */}
          <View style={wireframeStyles.heroMediaBox}>
            <Ionicons name="image-outline" size={20} color="#71717a" />
          </View>
        </View>
      </View>
    );
  }

  if (type === 'product_grid' || type === 'content_grid') {
    const cols = section.contract?.columns || 4;
    const cardRadius = section.contract?.cardRadius?.includes('0') ? 0 : 4;
    return (
      <View style={wireframeStyles.wireframeBox}>
        <View style={wireframeStyles.gridTitleRow}>
          <View style={wireframeStyles.gridTitleLine} />
          <View style={wireframeStyles.gridSubline} />
        </View>
        <View style={wireframeStyles.gridCardsRow}>
          {Array.from({ length: Math.min(cols, 4) }).map((_, i) => (
            <View
              key={i}
              style={[
                wireframeStyles.gridItemBox,
                {
                  borderRadius: cardRadius,
                },
              ]}
            >
              <View style={wireframeStyles.gridImageArea}>
                <Ionicons name="cube-outline" size={12} color="#a1a1aa" />
              </View>
              <View style={wireframeStyles.gridItemTextLine} />
              <View style={[wireframeStyles.gridItemPriceLine, { backgroundColor: themeAccent }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (type === 'story_banner') {
    return (
      <View style={wireframeStyles.wireframeBox}>
        <View style={[wireframeStyles.storyBannerWireframe, { backgroundColor: '#18181b' }]}>
          <View style={wireframeStyles.storyHeadlineLine} />
          <View style={wireframeStyles.storySubline} />
          <View style={wireframeStyles.storyChecklistRow}>
            <View style={[wireframeStyles.checkDot, { backgroundColor: themeAccent }]} />
            <View style={wireframeStyles.checkLine} />
            <View style={[wireframeStyles.checkDot, { backgroundColor: themeAccent }]} />
            <View style={wireframeStyles.checkLine} />
          </View>
        </View>
      </View>
    );
  }

  // Footer / fallback
  return (
    <View style={wireframeStyles.wireframeBox}>
      <View style={[wireframeStyles.footerWireframe, { backgroundColor: '#09090b' }]}>
        <View style={wireframeStyles.footerColsRow}>
          <View style={wireframeStyles.footerCol}>
            <View style={wireframeStyles.footerLineBold} />
            <View style={wireframeStyles.footerLineSmall} />
            <View style={wireframeStyles.footerLineSmall} />
          </View>
          <View style={wireframeStyles.footerCol}>
            <View style={wireframeStyles.footerLineBold} />
            <View style={wireframeStyles.footerLineSmall} />
            <View style={wireframeStyles.footerLineSmall} />
          </View>
          <View style={wireframeStyles.footerCol}>
            <View style={wireframeStyles.footerLineBold} />
            <View style={wireframeStyles.footerLineSmall} />
          </View>
        </View>
        <View style={wireframeStyles.footerBottomLine} />
      </View>
    </View>
  );
}

export default function WorkspaceSiteScreen({
  visible,
  onClose,
  workspaceName,
  subdomain,
  scope,
  products = [],
}: WorkspaceSiteScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const effectiveStoreId = scope || subdomain || 'default';
  const { draft, saveDraft, publish } = useSite(effectiveStoreId);

  const [activeTab, setActiveTab] = useState<'design_system' | 'sections'>('design_system');
  const [activeThemeId, setActiveThemeId] = useState<string>('milo');
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const cleanSub = (subdomain || 'site').replace(/^w:/, '');
  const siteUrl = `https://${cleanSub}.tarai.space`;

  const currentTheme = THEME_PRESETS.find((t) => t.id === activeThemeId) || THEME_PRESETS[0];

  const handleOpenLiveSite = () => {
    Linking.openURL(siteUrl);
  };

  // ⚡ 1-Tap Instant Theme Switch (< 50ms via Cloudflare KV)
  const handleSwitchTheme = async (themeId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setFeedback(null);
    setActiveThemeId(themeId);

    try {
      const res = await fetch(`https://${cleanSub}.tarai.space/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: cleanSub,
          workspaceName: workspaceName || cleanSub,
          template: themeId,
        }),
      });

      if (res.ok) {
        setFeedback({ text: `Theme switched to ${themeId.toUpperCase()}! Live on Edge.`, type: 'success' });
      } else {
        setFeedback({ text: 'Theme switch failed. Retrying...', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err?.message || 'Failed to switch theme.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 🤖 AI Layout Customization / Patching
  const handleAiCustomize = async (customPrompt?: string) => {
    const text = (customPrompt || instruction).trim();
    if (!text || isProcessing) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const productList = products.map((p) => ({
        name: p.title || p.name || 'Item',
        price: p.value || p.price || null,
        description: p.data?.description || '',
      }));

      const res = await fetch(`https://${cleanSub}.tarai.space/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: cleanSub,
          workspaceName: workspaceName || cleanSub,
          instruction: text,
          templateHint: activeThemeId,
          products: productList,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data?.plan) {
        await saveDraft(data.plan);
        await publish(cleanSub, workspaceName || cleanSub);
        setInstruction('');
        setFeedback({ text: 'Storefront updated & published live!', type: 'success' });
      } else {
        setFeedback({ text: data?.error || 'AI update could not be applied.', type: 'error' });
      }
    } catch (err: any) {
      setFeedback({ text: err?.message || 'Customization failed.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const sectionsToRender: ThemeSectionSpec[] = currentTheme.sections;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 12) + 4,
            paddingBottom: 0,
            backgroundColor: '#ffffff',
          },
        ]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* ── 1. CLEAN TOP BAR ── */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.backBtn}>
                <Ionicons name="close" size={22} color="#09090b" />
              </TouchableOpacity>
              <View>
                <Text style={styles.pageTitle}>{workspaceName || 'Storefront'}</Text>
                <Text style={styles.subdomainText}>{cleanSub}.tarai.space</Text>
              </View>
            </View>
            <View style={styles.topBarRight}>
              <TouchableOpacity
                onPress={handleOpenLiveSite}
                hitSlop={8}
                style={styles.openLiveBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={15} color="#007AFF" />
                <Text style={styles.openLiveText}>Live Site</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feedback Toast */}
          {feedback && (
            <View style={[styles.feedbackBanner, { backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2' }]}>
              <Ionicons
                name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={feedback.type === 'success' ? '#10b981' : '#ef4444'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.feedbackText, { color: feedback.type === 'success' ? '#065f46' : '#991b1b' }]}>
                {feedback.text}
              </Text>
            </View>
          )}

          {/* ── 2. FLAT SEGMENTED SELECTOR (Design System | Sections) matching EphemeralPlanCanvas ── */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('design_system')}
              style={[styles.tabItem, activeTab === 'design_system' && styles.tabItemActive]}
            >
              <Text style={[styles.tabItemText, activeTab === 'design_system' && styles.tabItemTextActive]}>
                Design System
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('sections')}
              style={[styles.tabItem, activeTab === 'sections' && styles.tabItemActive]}
            >
              <Text style={[styles.tabItemText, activeTab === 'sections' && styles.tabItemTextActive]}>
                Sections ({sectionsToRender.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 3. CONTENT AREA ── */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'design_system' ? (
              /* ── TAB 1: DESIGN SYSTEM (THEMES & TOKENS FROM .MD) ── */
              <View style={styles.tabContentContainer}>
                {/* Visual Theme Selector */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>SWITCH DESIGN THEME</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowList}>
                    {THEME_PRESETS.map((t) => {
                      const isSelected = activeThemeId === t.id;
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => handleSwitchTheme(t.id)}
                          disabled={isProcessing}
                          style={[
                            styles.themeCard,
                            {
                              borderColor: isSelected ? '#007AFF' : '#e4e4e7',
                              borderWidth: isSelected ? 2 : 1,
                              backgroundColor: '#ffffff',
                              opacity: isProcessing ? 0.7 : 1,
                            },
                          ]}
                        >
                          <View style={[styles.themeBanner, { backgroundColor: t.bg }]}>
                            <View style={[styles.themeDot, { backgroundColor: t.accent }]} />
                            {isSelected && <Ionicons name="checkmark-circle" size={15} color="#007AFF" style={styles.cardCheck} />}
                          </View>
                          <View style={styles.themeBody}>
                            <Text style={styles.themeTitle}>{t.name}</Text>
                            <Text style={styles.themeDesc} numberOfLines={1}>
                              {t.vibe}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 1. COLOR PALETTE TOKENS */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>COLOR PALETTE TOKENS</Text>
                  <View style={styles.colorPaletteGrid}>
                    {Object.entries(currentTheme.colors).map(([key, val]) => (
                      <View key={key} style={styles.colorSwatchCard}>
                        <View style={[styles.colorSwatchBox, { backgroundColor: val }]} />
                        <View style={styles.colorSwatchInfo}>
                          <Text style={styles.colorTokenName}>{key}</Text>
                          <Text style={styles.colorTokenVal} numberOfLines={1}>
                            {val}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 2. TYPOGRAPHY SYSTEM */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>TYPOGRAPHY TOKENS</Text>
                  <View style={styles.tokenDataCard}>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Heading Font</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.typography.fontHeading}</Text>
                    </View>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Body Font</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.typography.fontBody}</Text>
                    </View>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Weights</Text>
                      <Text style={styles.tokenSpecValue}>
                        {currentTheme.typography.headingWeight} Heading · {currentTheme.typography.bodyWeight} Body
                      </Text>
                    </View>
                    <View style={[styles.tokenSpecRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.tokenSpecLabel}>Heading Case</Text>
                      <Text style={styles.tokenSpecValue}>
                        {currentTheme.typography.transform || 'Standard'}
                      </Text>
                    </View>
                  </View>

                  {/* Type Scale Specs */}
                  <View style={[styles.tokenDataCard, { marginTop: 8 }]}>
                    <View style={styles.typeScaleHeader}>
                      <Text style={styles.typeScaleHeaderTitle}>TYPE SCALE & LINE HEIGHT</Text>
                    </View>
                    {Object.entries(currentTheme.typography.scale).map(([scaleKey, scaleVal], idx, arr) => (
                      <View
                        key={scaleKey}
                        style={[
                          styles.typeScaleRow,
                          idx < arr.length - 1 && styles.typeScaleRowBorder,
                        ]}
                      >
                        <Text style={styles.typeScaleName}>{scaleKey.toUpperCase()}</Text>
                        <Text style={styles.typeScaleSize}>{scaleVal}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 3. SHAPE & SURFACE TOKENS */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>SHAPE & GEOMETRY TOKENS</Text>
                  <View style={styles.tokenDataCard}>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Card Radius</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.shape.cardRadius}</Text>
                    </View>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Button Radius</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.shape.buttonRadius}</Text>
                    </View>
                    <View style={[styles.tokenSpecRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.tokenSpecLabel}>Button Style</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.shape.buttonStyle}</Text>
                    </View>
                  </View>
                </View>

                {/* 4. LAYOUT & SPACING GRID */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>SPACING & GRID SYSTEM</Text>
                  <View style={styles.tokenDataCard}>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Container Max Width</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.spacing.container}</Text>
                    </View>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Section Vertical Padding</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.spacing.sectionV}</Text>
                    </View>
                    <View style={styles.tokenSpecRow}>
                      <Text style={styles.tokenSpecLabel}>Column Grid</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.spacing.columns} Columns</Text>
                    </View>
                    <View style={[styles.tokenSpecRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.tokenSpecLabel}>Card Gap</Text>
                      <Text style={styles.tokenSpecValue}>{currentTheme.spacing.cardGap}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              /* ── TAB 2: SECTIONS LIST (FLAT NON-ROUNDED CARDS + WIREFRAMES + DETAILS) ── */
              <View style={styles.tabContentContainer}>
                <Text style={styles.sectionHeading}>ACTIVE SECTIONS MANIFEST ({sectionsToRender.length})</Text>

                {sectionsToRender.map((sec, idx) => {
                  const typeLabel = (sec.type || 'section').replace(/_/g, ' ').toUpperCase();
                  const indexStr = String(idx + 1).padStart(2, '0');

                  return (
                    <View key={sec.id || idx} style={styles.flatSectionCard}>
                      {/* Section Card Top Header */}
                      <View style={styles.flatSectionHeader}>
                        <View style={styles.flatSectionHeaderLeft}>
                          <View style={styles.flatIndexBadge}>
                            <Text style={styles.flatIndexText}>{indexStr}</Text>
                          </View>
                          <Text style={styles.flatSectionTitle}>{typeLabel}</Text>
                        </View>
                        <View style={styles.flatVariantBadge}>
                          <Text style={styles.flatVariantText}>{sec.variant}</Text>
                        </View>
                      </View>

                      {/* Structural Wireframe Graphic Preview */}
                      <View style={styles.flatWireframeWrapper}>
                        <SectionWireframe
                          section={sec}
                          themeAccent={currentTheme.accent}
                          themeBg={currentTheme.bg}
                        />
                      </View>

                      {/* Section Specifications & Details */}
                      <View style={styles.flatSpecsContainer}>
                        {sec.props?.text && (
                          <View style={styles.specItemRow}>
                            <Text style={styles.specItemLabel}>Content Text</Text>
                            <Text style={styles.specItemValue} numberOfLines={2}>
                              "{sec.props.text}"
                            </Text>
                          </View>
                        )}
                        {sec.props?.headline && (
                          <View style={styles.specItemRow}>
                            <Text style={styles.specItemLabel}>Headline</Text>
                            <Text style={styles.specItemValue} numberOfLines={2}>
                              "{sec.props.headline}"
                            </Text>
                          </View>
                        )}
                        {sec.props?.ctaText && (
                          <View style={styles.specItemRow}>
                            <Text style={styles.specItemLabel}>CTA Action</Text>
                            <Text style={styles.specItemValue}>
                              [{sec.props.ctaText}] · {sec.contract?.buttonShape || 'pill'}
                            </Text>
                          </View>
                        )}
                        {sec.contract?.columns && (
                          <View style={styles.specItemRow}>
                            <Text style={styles.specItemLabel}>Layout Grid</Text>
                            <Text style={styles.specItemValue}>
                              {sec.contract.columns} Columns · Gap: {sec.contract.gap || '20px'}
                            </Text>
                          </View>
                        )}
                        {sec.props?.items && (
                          <View style={[styles.specItemRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.specItemLabel}>Items</Text>
                            <Text style={styles.specItemValue} numberOfLines={2}>
                              {sec.props.items.join(' · ')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── 4. AI CUSTOMIZER & SUGGESTIONS ── */}
            <View style={[styles.sectionBlock, { marginTop: 12 }]}>
              <Text style={styles.sectionHeading}>AI DESIGN INSTRUCTION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionRow}>
                {AI_SUGGESTIONS.map((sug, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setInstruction(sug)}
                    style={styles.sugChip}
                  >
                    <Text style={styles.sugText}>{sug}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.aiInputContainer}>
                <TextInput
                  style={styles.aiInput}
                  value={instruction}
                  onChangeText={setInstruction}
                  placeholder="e.g. Make hero headline bolder..."
                  placeholderTextColor="#71717a"
                  editable={!isProcessing}
                />
                <Pressable
                  onPress={() => handleAiCustomize()}
                  disabled={isProcessing || !instruction.trim()}
                  style={[
                    styles.aiSendBtn,
                    {
                      backgroundColor: '#007AFF',
                      opacity: isProcessing || !instruction.trim() ? 0.5 : 1,
                    },
                  ]}
                >
                  {isProcessing ? (
                    <TarLogoLoader size={16} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const wireframeStyles = StyleSheet.create({
  wireframeBox: {
    padding: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  tickerWireframe: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  wireframeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  wireframeLineWide: {
    height: 4,
    width: '45%',
    backgroundColor: '#ffffff80',
    borderRadius: 2,
  },
  wireframeLineShort: {
    height: 4,
    width: '25%',
    backgroundColor: '#ffffff80',
    borderRadius: 2,
  },
  headerNavWireframe: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  logoWireframe: {
    width: 24,
    height: 8,
    backgroundColor: '#09090b',
    borderRadius: 1,
  },
  navLinksWireframe: {
    flexDirection: 'row',
    gap: 8,
  },
  navLinkLine: {
    width: 20,
    height: 4,
    backgroundColor: '#d4d4d8',
    borderRadius: 1,
  },
  ctaButtonWireframe: {
    width: 28,
    height: 12,
  },
  heroWireframe: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  heroLeftCol: {
    flex: 1.2,
    gap: 4,
    justifyContent: 'center',
  },
  badgeWireframe: {
    width: 40,
    height: 6,
    borderRadius: 2,
  },
  heroHeadlineLine1: {
    width: '90%',
    height: 8,
    backgroundColor: '#09090b',
    borderRadius: 1,
  },
  heroHeadlineLine2: {
    width: '70%',
    height: 8,
    backgroundColor: '#09090b',
    borderRadius: 1,
  },
  heroSubline: {
    width: '80%',
    height: 5,
    backgroundColor: '#a1a1aa',
    borderRadius: 1,
    marginTop: 2,
  },
  heroCtaBtn: {
    width: 48,
    height: 14,
    marginTop: 4,
  },
  heroMediaBox: {
    flex: 1,
    height: 64,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  gridTitleRow: {
    gap: 3,
    marginBottom: 6,
  },
  gridTitleLine: {
    width: '35%',
    height: 7,
    backgroundColor: '#09090b',
    borderRadius: 1,
  },
  gridSubline: {
    width: '50%',
    height: 4,
    backgroundColor: '#a1a1aa',
    borderRadius: 1,
  },
  gridCardsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  gridItemBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 4,
    gap: 3,
  },
  gridImageArea: {
    height: 28,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemTextLine: {
    height: 4,
    width: '80%',
    backgroundColor: '#71717a',
    borderRadius: 1,
  },
  gridItemPriceLine: {
    height: 4,
    width: '40%',
    borderRadius: 1,
  },
  storyBannerWireframe: {
    padding: 8,
    gap: 5,
    alignItems: 'center',
  },
  storyHeadlineLine: {
    width: '60%',
    height: 7,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  storySubline: {
    width: '45%',
    height: 4,
    backgroundColor: '#a1a1aa',
    borderRadius: 1,
  },
  storyChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  checkDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  checkLine: {
    width: 32,
    height: 4,
    backgroundColor: '#d4d4d8',
    borderRadius: 1,
  },
  footerWireframe: {
    padding: 8,
    gap: 6,
  },
  footerColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerCol: {
    gap: 3,
  },
  footerLineBold: {
    width: 24,
    height: 5,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  footerLineSmall: {
    width: 18,
    height: 3,
    backgroundColor: '#71717a',
    borderRadius: 1,
  },
  footerBottomLine: {
    height: 1,
    backgroundColor: '#27272a',
    width: '100%',
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#09090b',
    letterSpacing: -0.3,
  },
  subdomainText: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  openLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  feedbackText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 2.5,
    marginTop: 8,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  tabItemText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#71717a',
  },
  tabItemTextActive: {
    color: '#09090b',
    fontWeight: '800',
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    gap: 12,
  },
  tabContentContainer: {
    gap: 12,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    color: '#71717a',
  },
  rowList: {
    gap: 8,
    paddingVertical: 2,
  },
  themeCard: {
    width: 145,
    borderRadius: 8,
    overflow: 'hidden',
  },
  themeBanner: {
    height: 30,
    width: '100%',
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardCheck: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  themeBody: {
    padding: 8,
    gap: 2,
  },
  themeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090b',
  },
  themeDesc: {
    fontSize: 10,
    color: '#71717a',
  },
  colorPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorSwatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48.5%',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f4f4f5',
    padding: 6,
    gap: 6,
  },
  colorSwatchBox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#00000015',
  },
  colorSwatchInfo: {
    flex: 1,
  },
  colorTokenName: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#09090b',
    textTransform: 'capitalize',
  },
  colorTokenVal: {
    fontSize: 9.5,
    color: '#71717a',
    fontFamily: 'monospace',
  },
  tokenDataCard: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f4f4f5',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  tokenSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tokenSpecLabel: {
    fontSize: 11.5,
    color: '#52525b',
    fontWeight: '500',
  },
  tokenSpecValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#09090b',
    fontFamily: 'monospace',
  },
  typeScaleHeader: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  typeScaleHeaderTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 0.05,
  },
  typeScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5.5,
  },
  typeScaleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeScaleName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#09090b',
  },
  typeScaleSize: {
    fontSize: 10,
    color: '#71717a',
    fontFamily: 'monospace',
  },
  flatSectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 10,
    gap: 8,
    marginBottom: 8,
  },
  flatSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flatSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flatIndexBadge: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  flatIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#09090b',
    fontFamily: 'monospace',
  },
  flatSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#09090b',
    letterSpacing: -0.2,
  },
  flatVariantBadge: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flatVariantText: {
    fontSize: 9.5,
    color: '#52525b',
    fontFamily: 'monospace',
  },
  flatWireframeWrapper: {
    overflow: 'hidden',
  },
  flatSpecsContainer: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  specItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  specItemLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#71717a',
  },
  specItemValue: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#09090b',
    flex: 1,
    textAlign: 'right',
  },
  suggestionRow: {
    gap: 6,
    paddingVertical: 2,
  },
  sugChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#fafafa',
  },
  sugText: {
    fontSize: 11,
    color: '#52525b',
  },
  aiInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    backgroundColor: '#fafafa',
    marginTop: 4,
  },
  aiInput: {
    flex: 1,
    fontSize: 12.5,
    paddingVertical: 4,
    color: '#09090b',
  },
  aiSendBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
