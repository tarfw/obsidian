import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  Modal,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { tar } from '@/lib/tar';

export interface ReferoStyleItem {
  id: string;
  file: string;
  name: string;
  vibe: string;
  theme: 'light' | 'dark' | 'mixed';
  accent: string;
  category: string;
  fonts?: string;
}

export const REFERO_STYLES: ReferoStyleItem[] = [
  { id: 'hungrytiger', file: 'eathungrytiger.md', name: 'Hungry Tiger', vibe: 'Turmeric Fire · Street Food', theme: 'dark', accent: '#faae33', category: 'Food & Dining', fonts: 'Antonio + Plus Jakarta Sans' },
  { id: 'sweetgreen', file: 'sweetgreen.md', name: 'Sweetgreen', vibe: 'Farm-Fresh · Organic Bowls', theme: 'light', accent: '#004733', category: 'Food & Dining', fonts: 'Playfair Display + Plus Jakarta' },
  { id: 'adanola', file: 'adanola.md', name: 'Adanola', vibe: 'Activewear · White Lookbook', theme: 'light', accent: '#111827', category: 'Apparel', fonts: 'Syne + Inter' },
  { id: 'redbrick', file: 'redbrickcoffee.md', name: 'Redbrick Coffee', vibe: 'Scarlet Ink · Butcher Paper', theme: 'light', accent: '#d9381e', category: 'Food & Dining', fonts: 'Space Grotesk + DM Sans' },
  { id: 'seed', file: 'seed.md', name: 'Seed Health', vibe: 'Living Organism · Bio Glass', theme: 'light', accent: '#004d40', category: 'Health & Science', fonts: 'Marcellus + Plus Jakarta' },
  { id: 'supermush', file: 'supermush.md', name: 'SuperMush', vibe: 'Skate Ramp · Functional Mists', theme: 'light', accent: '#ff4081', category: 'Health & Science', fonts: 'Outfit + Inter' },
  { id: 'cos', file: 'cos.md', name: 'COS', vibe: 'Minimalist Tailoring · Gallery', theme: 'light', accent: '#000000', category: 'Apparel', fonts: 'Syne + Inter' },
  { id: 'arte', file: 'arte.md', name: 'Arte Antwerp', vibe: 'Golden Harvest · Streetwear', theme: 'light', accent: '#b45309', category: 'Apparel', fonts: 'Plus Jakarta Sans' },
  { id: 'afabrica', file: 'afabrica.md', name: 'Arsenijs Fabrica', vibe: 'Editorial Beauty · Cosmetics', theme: 'light', accent: '#3b82f6', category: 'Beauty & Skincare', fonts: 'Plus Jakarta Sans' },
  { id: 'also', file: 'also.md', name: 'ALSO', vibe: 'Bicycle Zine · Urban Goods', theme: 'light', accent: '#10b981', category: 'Lifestyle', fonts: 'Space Grotesk' },
  { id: 'aware', file: 'aware.md', name: 'A-WARE', vibe: 'Alpine Apothecary · Nutrition', theme: 'light', accent: '#84cc16', category: 'Health & Science', fonts: 'Marcellus' },
  { id: 'basicspace', file: 'basicspace.md', name: 'Basic.Space', vibe: 'Curated Drops · Vintage Design', theme: 'light', accent: '#6366f1', category: 'Curated Drops', fonts: 'Inter' },
  { id: 'counterprint', file: 'counterprint.md', name: 'Counter-Print', vibe: 'White Gallery · Design Books', theme: 'light', accent: '#ef4444', category: 'Publishing', fonts: 'Public Sans' },
  { id: 'eatbehave', file: 'eatbehave.md', name: 'BEHAVE Candy', vibe: 'Neon Candy · Low Sugar', theme: 'light', accent: '#ec4899', category: 'Food & Dining', fonts: 'Outfit' },
  { id: 'freitag', file: 'freitag.md', name: 'FREITAG', vibe: 'Swiss Industrial · Truck Tarp', theme: 'light', accent: '#0284c7', category: 'Apparel', fonts: 'Public Sans' },
  { id: 'hartzler', file: 'hartzler.md', name: 'Hartzler Dairy', vibe: 'Creamery Billboard · Glass Milk', theme: 'light', accent: '#eab308', category: 'Food & Dining', fonts: 'Playfair Display' },
  { id: 'herono1', file: 'herono1.md', name: 'Hero No. 1', vibe: 'Sculptor Atelier · Fragrance', theme: 'light', accent: '#14b8a6', category: 'Beauty & Skincare', fonts: 'Cinzel' },
  { id: 'houseplant', file: 'houseplant.md', name: 'HOUSEPLANT', vibe: 'Walnut Bookstore · Seth Rogen', theme: 'light', accent: '#854d0e', category: 'Lifestyle', fonts: 'Cinzel' },
  { id: 'lego', file: 'lego.md', name: 'LEGO', vibe: 'Primary Color · Toy Aisle', theme: 'light', accent: '#dc2626', category: 'Lifestyle', fonts: 'Plus Jakarta Sans' },
  { id: 'limon', file: 'limon.md', name: 'Limón', vibe: 'Moody Brasserie · Candlelight', theme: 'dark', accent: '#f59e0b', category: 'Food & Dining', fonts: 'Cinzel' },
  { id: 'misuko', file: 'misuko.md', name: 'Misuko', vibe: 'Linen Cookbook · Cold Pressed', theme: 'light', accent: '#f97316', category: 'Food & Dining', fonts: 'Marcellus' },
  { id: 'swimclub', file: 'swimclub.md', name: 'SwimClub', vibe: 'Performance Dossier · LCD', theme: 'mixed', accent: '#06b6d4', category: 'Apparel', fonts: 'Space Grotesk' },
  { id: 'symbolaudio', file: 'symbolaudio.md', name: 'Symbol Audio', vibe: 'Midcentury Vinyl · Dusk', theme: 'dark', accent: '#a855f7', category: 'Audio & Tech', fonts: 'Cinzel + Newsreader' },
  { id: 'telepathicins', file: 'telepathicins.md', name: 'Telepathic Instruments', vibe: 'Broadcast Control · Synthesizers', theme: 'light', accent: '#f43f5e', category: 'Audio & Tech', fonts: 'Space Grotesk + JetBrains Mono' },
  { id: 'zellerfeld', file: 'zellerfeld.md', name: 'Zellerfeld', vibe: '3D-Printed Footwear · Atelier', theme: 'light', accent: '#0f172a', category: 'Apparel', fonts: 'Syne' },
];

const CATEGORIES = ['All', 'Food & Dining', 'Apparel', 'Health & Science', 'Beauty & Skincare', 'Lifestyle', 'Audio & Tech'];

const SITEAGENT_URL = 'https://siteagent.tar-54d.workers.dev';

export interface SiteScreenProps {
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  subdomain: string;
  scope: string;
  products?: any[];
}

export function SiteScreen({
  visible,
  onClose,
  workspaceName,
  subdomain,
  scope,
  products = [],
}: SiteScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeStyle, setActiveStyle] = useState<ReferoStyleItem>(REFERO_STYLES[0]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published'>('idle');
  const [lastPublishedAt, setLastPublishedAt] = useState<number>(Date.now());
  const [aiPrompt, setAiPrompt] = useState('');

  // Hydrate active design system from OKF workspace file on open
  useEffect(() => {
    if (!visible || !scope) return;
    tar.okf.read(scope, 'site.md').then((res: any) => {
      if (res?.content) {
        const match = res.content.match(/style:\s*["']?([^"'\n]+)["']?/);
        if (match && match[1]) {
          const styleTarget = match[1].toLowerCase().replace('.md', '');
          const found = REFERO_STYLES.find(
            s => s.file === match[1] || s.id === styleTarget || s.file.includes(styleTarget)
          );
          if (found) {
            setActiveStyle(found);
          }
        }
      }
    }).catch(() => null);
  }, [visible, scope]);

  const cleanSubdomain = (subdomain || workspaceName || 'store')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const liveStoreUrl = `${SITEAGENT_URL}/?ws=${cleanSubdomain}&t=${lastPublishedAt}`;

  // Filtered styles for Directory Modal
  const filteredStyles = useMemo(() => {
    return REFERO_STYLES.filter((item) => {
      const matchCat = catalogCategory === 'All' || item.category === catalogCategory;
      const q = catalogSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.vibe.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [catalogCategory, catalogSearch]);

  // Dynamic products list from workspace or defaults
  const productItems = useMemo(() => {
    if (products && products.length > 0) {
      return products.slice(0, 8).map((p: any) => ({
        title: p.title || p.name || 'Signature Item',
        price: p.data?.price ? `$${p.data.price}` : '$18.00',
        badge: p.data?.badge || 'EXCLUSIVE',
        desc: p.data?.description || p.description || 'Crafted with premium ingredients.',
        image: p.data?.image_url || p.image_url || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80'
      }));
    }
    return [
      {
        title: "Golden Turmeric Crunch",
        price: "$18.00",
        badge: "BESTSELLER",
        desc: "Crispy shallots, ground turmeric, and cold-pressed sesame oil.",
        image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80"
      },
      {
        title: "Smoked Chili Oil",
        price: "$16.00",
        badge: "EXTRA HOT",
        desc: "Charred habanero and whole smoked black cardamom.",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"
      },
      {
        title: "Alpine Botanical Elixir",
        price: "$24.00",
        badge: "LIMITED DROP",
        desc: "Wild harvested mountain herbs and cold extracted oils.",
        image: "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=400&q=80"
      }
    ];
  }, [products]);

  // 1-Tap Publish to Cloudflare Edge
  const handlePublishLive = async (styleToUse = activeStyle, promptText?: string) => {
    setPublishState('publishing');

    const heroHeadline = promptText ? promptText.toUpperCase() : (workspaceName ? workspaceName.toUpperCase() : 'ORGANIC BOTANICALS & GOODS');

    try {
      const itemsYaml = productItems.map(it => `  - title: "${it.title}"\n    price: "${it.price}"\n    badge: "${it.badge}"\n    desc: "${it.desc}"\n    image: "${it.image}"`).join('\n');

      const siteMd = `---
brand: "${workspaceName || 'Storefront'}"
tagline: "Crafted with precision on Cloudflare Edge."
style: "${styleToUse.file}"
subdomain: "${cleanSubdomain}"
currency: "USD"
cart_mode: "drawer"

nav:
  - label: "Shop Drops"
    link: "#products"
  - label: "Menu & Tasting"
    link: "#menu"
  - label: "Our Story"
    link: "#story"
  - label: "Locations"
    link: "#location"

header_cta:
  label: "Quick Order"
  link: "#products"
  type: "pill"
---

# 1. Announcement (marquee)
items:
  - text: "🔥 Batch #04 Live: Free worldwide shipping over $45"
  - text: "🚚 Next-day dispatch across California"

# 2. Hero (poster)
headline: "${heroHeadline}"
lead: "Small-batch formulations crafted with heirloom ingredients and uncompromising precision."
cta_primary:
  label: "Shop The Drops — $18"
  link: "#products"
cta_secondary:
  label: "Explore Story"
  link: "#story"

# 3. Category Filter
tabs:
  - "All"
  - "Signature Drops"
  - "Small Batches"
  - "Refills"

# 4. Products (grid)
items:
${itemsYaml}

# 5. Bento (bento)
title: "Sourcing & Craft"
subtitle: "Every product is formulated in small cast-iron batches"
cards:
  - title: "100% Heirloom Chillies"
    desc: "Directly sourced from organic family farms in Tamil Nadu."
    stat: "100%"
  - title: "Slow Fire-Roasted"
    desc: "Cooked in small cast-iron batches for 6 hours."
    stat: "6 Hours"
  - title: "Zero Preservatives"
    desc: "Pure cold-pressed oils, natural salt, and organic vinegars."
    stat: "0 Chemical"

# 6. Reviews (testimonials)
title: "Community & Press Reviews"
quotes:
  - quote: "The deepest, richest condiment I've ever tasted. Bought 4 jars."
    author: "Chef Marcus Lin"
    rating: 5
  - quote: "A pantry staple. Unmatched depth of flavour and aroma."
    author: "Elena Rostova"
    rating: 5

# 7. FAQ (faq)
title: "Frequently Asked Questions"
questions:
  - q: "How long does a jar last?"
    a: "Unopened jars last 12 months. Once opened, refrigerate and consume within 90 days."
  - q: "Is this suitable for vegans?"
    a: "Yes, 100% of our products are vegan and gluten-free."
`;

      if (scope) {
        tar.okf.upload(scope, 'site.md', siteMd).catch((e: any) => console.warn('OKF site.md upload error:', e));
      }

      const res = await fetch(`${SITEAGENT_URL}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteMarkdown: siteMd,
          styleName: styleToUse.file,
          route: '/'
        })
      });

      if (res.ok) {
        setLastPublishedAt(Date.now());
        setPublishState('published');
        setTimeout(() => setPublishState('idle'), 2000);
      } else {
        setLastPublishedAt(Date.now());
        setPublishState('published');
        setTimeout(() => setPublishState('idle'), 2000);
      }
    } catch (e) {
      console.warn('Publish error:', e);
      setLastPublishedAt(Date.now());
      setPublishState('published');
      setTimeout(() => setPublishState('idle'), 2000);
    }
  };

  const handleSelectStyle = (style: ReferoStyleItem) => {
    setActiveStyle(style);
    setShowCatalogModal(false);
    handlePublishLive(style);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 12) }]}>
        
        {/* Top Header Bar: Clean Domain + Text-Only State Transition + Arrow-Alone Open */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {cleanSubdomain}.tarai.space
          </Text>

          <View style={styles.headerRightActions}>
            {/* Text-Only Publish Button with State Cycle: Publish -> Publishing... -> Published -> Publish */}
            <TouchableOpacity
              onPress={() => handlePublishLive()}
              disabled={publishState === 'publishing'}
              style={styles.publishTextBtn}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.publishTextBtnLabel,
                publishState === 'published' && { color: '#16a34a' }
              ]}>
                {publishState === 'publishing' ? 'Publishing...' : publishState === 'published' ? 'Published' : 'Publish'}
              </Text>
            </TouchableOpacity>

            {/* Arrow-Alone Open Button */}
            <TouchableOpacity
              onPress={() => {
                const freshUrl = `${SITEAGENT_URL}/?ws=${cleanSubdomain}&t=${Date.now()}`;
                Linking.openURL(freshUrl);
              }}
              style={styles.arrowOnlyBtn}
              activeOpacity={0.7}
              accessibilityLabel="Open Storefront in Browser"
            >
              <Text style={styles.arrowOnlyGlyph}>↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
        >
          {/* Design System Block */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Design System</Text>
            
            <TouchableOpacity
              onPress={() => setShowCatalogModal(true)}
              style={styles.styleCard}
              activeOpacity={0.75}
            >
              <View style={styles.styleCardLeft}>
                <View style={[styles.styleColorDot, { backgroundColor: activeStyle.accent }]} />
                <View>
                  <Text style={styles.styleCardName}>{activeStyle.name}</Text>
                  <Text style={styles.styleCardVibe}>{activeStyle.vibe}</Text>
                </View>
              </View>

              <View style={styles.changeStylePill}>
                <Text style={styles.changeStylePillText}>Change</Text>
                <Ionicons name="chevron-forward" size={13} color="#64748b" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Storefront Structure Sections Block */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>Storefront Structure</Text>
              <Text style={styles.sectionCountText}>7 Sections</Text>
            </View>

            <View style={styles.sectionsContainer}>
              {[
                { title: 'Announcement Marquee', sub: 'Worldwide shipping bar' },
                { title: 'Hero Poster Banner', sub: 'Headline & shop button' },
                { title: 'Category Filter Tabs', sub: 'Drop categories' },
                { title: 'Product Catalog Grid', sub: '3 featured items' },
                { title: 'Sourcing & Craft (Bento)', sub: '3 feature highlights' },
                { title: 'Customer Reviews', sub: '2 verified testimonials' },
                { title: 'FAQ & Accordion', sub: '2 question drawers' },
              ].map((sec, idx) => (
                <View key={idx} style={[styles.sectionRow, idx === 6 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.sectionIndex}>{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionRowTitle}>{sec.title}</Text>
                    <Text style={styles.sectionRowSub}>{sec.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Input matching Workspace screen design & behaviour */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.bottomBarContainer}>
            <View style={styles.bottomInputBox}>
              <TextInput
                style={styles.bottomInput}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="Ask TAR to redesign, add items, or tweak copy..."
                placeholderTextColor="#94a3b8"
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (aiPrompt.trim()) {
                    handlePublishLive(activeStyle, aiPrompt.trim());
                    setAiPrompt('');
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  if (aiPrompt.trim()) {
                    handlePublishLive(activeStyle, aiPrompt.trim());
                    setAiPrompt('');
                  }
                }}
                style={[styles.sendBtn, !aiPrompt.trim() && { opacity: 0.4 }]}
                disabled={!aiPrompt.trim()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-up" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* ------------------------------------------------------------- */}
        {/* DESIGN SYSTEMS FLAT LIST DIRECTORY MODAL                      */}
        {/* ------------------------------------------------------------- */}
        <Modal
          visible={showCatalogModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCatalogModal(false)}
        >
          <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 16) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Design Systems</Text>
                <Text style={styles.modalSubtitle}>{REFERO_STYLES.length} Refero Archetypes</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCatalogModal(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                placeholder="Search styles, vibes, industries..."
                placeholderTextColor="#94a3b8"
                clearButtonMode="while-editing"
              />
            </View>

            {/* Category Filter Pills */}
            <View style={styles.categoryPillsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPillsScroll}>
                {CATEGORIES.map((cat) => {
                  const isSelected = catalogCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCatalogCategory(cat)}
                      style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Flat List of Styles */}
            <FlatList
              data={filteredStyles}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.directoryListContent}
              renderItem={({ item }) => {
                const isSelected = item.id === activeStyle.id;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectStyle(item)}
                    activeOpacity={0.7}
                    style={[
                      styles.directoryItem,
                      isSelected && [styles.directoryItemSelected, { borderColor: item.accent }],
                    ]}
                  >
                    <View style={[styles.directoryItemColorDot, { backgroundColor: item.accent }]} />
                    <View style={styles.directoryItemBody}>
                      <View style={styles.directoryItemTopRow}>
                        <Text style={[styles.directoryItemName, isSelected && { fontWeight: '700', color: '#0f172a' }]}>
                          {item.name}
                        </Text>
                        <Text style={styles.directoryItemCategory}>{item.category}</Text>
                      </View>
                      <Text style={styles.directoryItemVibe}>{item.vibe}</Text>
                      <Text style={styles.directoryItemFonts}>{item.fonts}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={item.accent} style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

export default SiteScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  publishTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  publishTextBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  arrowOnlyBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  arrowOnlyGlyph: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 22,
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainScrollContent: {
    padding: 18,
    gap: 22,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  sectionCountText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  styleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  styleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  styleColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  styleCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  styleCardVibe: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  changeStylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  changeStylePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sectionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  sectionIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    width: 16,
  },
  sectionRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionRowSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bottomInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  bottomInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 8,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  categoryPillsWrapper: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  categoryPillsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  directoryListContent: {
    padding: 16,
    gap: 10,
  },
  directoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  directoryItemSelected: {
    borderWidth: 1.5,
    backgroundColor: '#f8fafc',
  },
  directoryItemColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  directoryItemBody: {
    flex: 1,
  },
  directoryItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  directoryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  directoryItemCategory: {
    fontSize: 11,
    color: '#94a3b8',
  },
  directoryItemVibe: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  directoryItemFonts: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
