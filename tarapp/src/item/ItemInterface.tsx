import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ActionInterfaceProps } from '@/action-interfaces/types';
import { createOperationKey, harness } from '@/lib/harness';

interface VariantItem {
  id: string;
  option: string;
  dimension: string;
  selected: boolean;
  price?: string;
  stock?: string;
}

export default function ItemInterface(props: ActionInterfaceProps) {
  if (!props.visible) return null;
  return <ItemForm {...props} />;
}

function ItemForm(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();

  // 1. Human Physical Facts
  const [photo, setPhoto] = useState<{ uri: string; fileName: string } | null>(null);
  const [name, setName] = useState(String(props.initialInput?.name || ''));
  const [price, setPrice] = useState(
    props.initialInput?.price !== undefined ? String(Number(props.initialInput.price) / 100) : ''
  );
  const [stock, setStock] = useState(
    props.initialInput?.stock !== undefined ? String(props.initialInput.stock) : '1'
  );

  // 2. Universal Brief State (Flat list blocks of text)
  const initialBrief = String(props.initialInput?.brief || props.initialInput?.description || '');
  const [briefBlocks, setBriefBlocks] = useState<string[]>(() => {
    if (!initialBrief.trim()) return [];
    return initialBrief.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  });
  const [newBlock, setNewBlock] = useState('');
  const [briefModalVisible, setBriefModalVisible] = useState(false);

  // 3. JEV Judgments & Deterministic Code Guards
  const [category, setCategory] = useState(String(props.initialInput?.category || ''));
  const [unit, setUnit] = useState(String(props.initialInput?.unit || 'piece'));
  const [taxBps, setTaxBps] = useState<number>(Number(props.initialInput?.tax ?? 500)); // Default 5% GST
  const [variants, setVariants] = useState<VariantItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const priceNum = Number(price.replace(/,/g, '')) || 0;
  const canPublish = Boolean(name.trim() && priceNum > 0 && !saving);

  // Deterministic SKU
  const skuCode = useMemo(() => {
    const base = (name.trim() || 'ITEM').toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10);
    return `SKU-${base}`;
  }, [name]);

  // Image picking
  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          fileName: asset.fileName || `product_${Date.now()}.jpg`,
        });
      }
    } catch {
      Alert.alert('Image error', 'Could not access photo gallery.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission', 'Please grant camera access to photograph products.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          fileName: `camera_${Date.now()}.jpg`,
        });
      }
    } catch {
      Alert.alert('Camera unavailable', 'Could not open camera.');
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Product Photo', 'Select image source', [
      { text: 'Take Photo', onPress: () => void takePhoto() },
      { text: 'Choose from Gallery', onPress: () => void pickPhoto() },
      ...(photo ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setPhoto(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  // Stepper for stock count
  const adjustStock = (delta: number) => {
    const current = parseInt(stock, 10) || 0;
    const next = Math.max(0, current + delta);
    setStock(String(next));
  };

  // Run JEV detection from brief blocks
  const runJevDetection = async (overrideBlocks?: string[]) => {
    const blocks = overrideBlocks !== undefined ? overrideBlocks : briefBlocks;
    const prompt = blocks.join(', ').trim();
    if (!prompt && !name.trim()) return;

    setDetecting(true);
    try {
      const result = await harness.detectVariants(props.scope, {
        product: name.trim() || 'Product',
        brief: prompt || name.trim(),
        input: prompt || name.trim(),
        trade: category.toLowerCase() || 'retail',
      });

      if (result) {
        if (result.category) setCategory(result.category);
        if (result.unit) setUnit(result.unit);
        if (result.tax) setTaxBps(result.tax);
        if (result.title && !name.trim()) setName(result.title);
        if (result.variants && result.variants.length > 0) {
          const mapped: VariantItem[] = result.variants.map((v, idx) => ({
            id: String(Date.now() + idx),
            option: v.option,
            dimension: v.dimension || result.dimension,
            selected: true,
            price: price,
            stock: String(Math.max(1, Math.floor((Number(stock) || 1) / result.variants.length))),
          }));
          setVariants(mapped);
        }
      }
    } catch {
      // Retain existing values on failure
    } finally {
      setDetecting(false);
    }
  };

  const addCurrentBlock = () => {
    const text = newBlock.trim();
    if (!text) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      setBriefBlocks((prev) => [...prev, ...lines]);
    }
    setNewBlock('');
  };

  const removeBlock = (index: number) => {
    setBriefBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const closeBriefModal = () => {
    let currentBlocks = [...briefBlocks];
    if (newBlock.trim()) {
      const text = newBlock.trim();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      currentBlocks = [...currentBlocks, ...lines];
      setBriefBlocks(currentBlocks);
      setNewBlock('');
    }
    setBriefModalVisible(false);
    void runJevDetection(currentBlocks);
  };

  const toggleVariant = (id: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  // Submit product to Turso & Edge
  const submit = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Name required', 'Please enter a product name.');
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      Alert.alert('Price required', 'Please enter a selling price.');
      return;
    }

    setSaving(true);
    try {
      const pricePaise = Math.round(priceNum * 100);
      const initialStockCount = Math.max(0, parseInt(stock, 10) || 0);

      const activeVariants = variants
        .filter((v) => v.selected)
        .map((v) => ({
          name: `${cleanName} (${v.option})`,
          option: v.option,
          dimension: v.dimension || 'option',
          price: v.price ? Math.round((Number(v.price) || priceNum) * 100) : pricePaise,
          stock: v.stock ? Math.max(0, parseInt(v.stock, 10) || 0) : initialStockCount,
        }));

      const payload = {
        name: cleanName,
        category: category.trim(),
        price: pricePaise,
        mrp: pricePaise,
        stock: initialStockCount,
        tax: taxBps,
        unit: unit.trim().toLowerCase() || 'piece',
        photoUrl: photo?.uri || '',
        status: 'active',
        brief: briefBlocks.join('\n'),
        description: briefBlocks.join('\n'),
        ...(activeVariants.length > 0 ? { variants: activeVariants } : {}),
      };

      const result = await harness.executeAction(
        props.scope,
        'catalog.item.save',
        payload,
        createOperationKey('catalog.item.save')
      );

      Alert.alert(
        'Product Published',
        `"${cleanName}" is now active in your catalog.`,
        [
          {
            text: 'Undo',
            style: 'destructive',
            onPress: async () => {
              try {
                if (result.item && typeof result.item === 'object' && 'id' in result.item) {
                  await harness.executeAction(
                    props.scope,
                    'catalog.item.save',
                    { id: (result.item as { id: string }).id, status: 'archived', name: cleanName },
                    createOperationKey('catalog.item.undo')
                  );
                }
              } catch {
                // Ignore rollback failure
              }
            },
          },
          {
            text: 'Done',
            onPress: () => {
              props.onSuccess(result);
              props.onClose();
            },
          },
        ]
      );
    } catch (cause) {
      Alert.alert('Error', cause instanceof Error ? cause.message : 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Top Header: Back Icon, Title, Publish */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          disabled={saving}
          style={styles.backButton}
          onPress={props.onClose}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.title}>
            Add Product
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            disabled={!canPublish}
            style={styles.publishHeaderBtn}
            onPress={() => void submit()}
            accessibilityLabel="Publish Product"
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={[styles.publishHeaderText, !canPublish && styles.publishHeaderDisabled]}>
                Publish
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. STRICT TWO-COLUMN DATA LIST (Clean, Razor-sharp, Undisturbed) */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.twoColumnTable}>
          {/* Row 1: Photo */}
          <TouchableOpacity
            style={styles.tableRow}
            onPress={showPhotoOptions}
            accessibilityRole="button"
          >
            <Text style={styles.columnLabel}>Photo</Text>
            <View style={styles.columnValue}>
              {photo ? (
                <View style={styles.photoInline}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                  <Text style={styles.linkText}>Change</Text>
                </View>
              ) : (
                <Text style={styles.linkText}>Add photo</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Row 2: Name */}
          <View style={styles.tableRow}>
            <Text style={styles.columnLabel}>Name *</Text>
            <View style={styles.columnValue}>
              <TextInput
                style={styles.tableInput}
                placeholder="e.g. Saree or Shirt"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                editable={!saving}
              />
            </View>
          </View>

          {/* Row 3: Price */}
          <View style={styles.tableRow}>
            <Text style={styles.columnLabel}>Price (₹) *</Text>
            <View style={[styles.columnValue, styles.inlineRow]}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={[styles.tableInput, styles.numericInput]}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                editable={!saving}
              />
              {priceNum > 0 ? (
                <Text style={styles.subtext}>
                  (₹{Number(priceNum).toLocaleString('en-IN')})
                </Text>
              ) : null}
            </View>
          </View>

          {/* Row 4: Stock */}
          <View style={styles.tableRow}>
            <Text style={styles.columnLabel}>Stock *</Text>
            <View style={[styles.columnValue, styles.inlineRow]}>
              <TouchableOpacity
                style={styles.stepperMiniBtn}
                onPress={() => adjustStock(-1)}
                disabled={saving || (parseInt(stock, 10) || 0) <= 0}
              >
                <Ionicons name="remove" size={15} color="#1E293B" />
              </TouchableOpacity>
              <TextInput
                style={styles.stepperMiniValue}
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.stepperMiniBtn}
                onPress={() => adjustStock(1)}
                disabled={saving}
              >
                <Ionicons name="add" size={15} color="#1E293B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 5: Brief (Tap opens detached bottom sheet) */}
          <TouchableOpacity
            style={styles.tableRow}
            onPress={() => setBriefModalVisible(true)}
            accessibilityRole="button"
          >
            <Text style={styles.columnLabel}>Brief</Text>
            <View style={[styles.columnValue, styles.inlineRow]}>
              <Text
                numberOfLines={1}
                style={[styles.columnText, briefBlocks.length === 0 && styles.placeholderText]}
              >
                {briefBlocks.length > 0 ? briefBlocks.join(' · ') : 'Tap to describe...'}
              </Text>
              <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Row 6: Category (JEV Decided) */}
          <View style={styles.tableRow}>
            <Text style={styles.columnLabel}>Category</Text>
            <View style={styles.columnValue}>
              <Text style={styles.columnText}>
                {category || (detecting ? 'Detecting...' : 'General Merchandise')}
              </Text>
            </View>
          </View>

          {/* Row 7: Tax */}
          <View style={styles.tableRow}>
            <Text style={styles.columnLabel}>Tax</Text>
            <View style={styles.columnValue}>
              <Text style={styles.columnText}>GST {taxBps / 100}%</Text>
            </View>
          </View>

          {/* Row 8: Unit */}
          <View style={styles.tableRow}>
            <Text style={styles.columnLabel}>Unit</Text>
            <View style={styles.columnValue}>
              <Text style={styles.columnText}>{unit}</Text>
            </View>
          </View>

          {/* Row 9: Code / SKU */}
          <View style={styles.tableRow}>
            <Text style={styles.columnLabel}>Code</Text>
            <View style={styles.columnValue}>
              <Text style={styles.codeText}>{skuCode}</Text>
            </View>
          </View>

          {/* Row 10: Options (JEV Decided) */}
          {variants.length > 0 ? (
            <View style={[styles.tableRow, styles.optionsRow]}>
              <Text style={styles.columnLabel}>Options</Text>
              <View style={styles.variantChipsContainer}>
                {variants.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.variantChip, v.selected && styles.variantChipSelected]}
                    onPress={() => toggleVariant(v.id)}
                  >
                    <Text
                      style={[
                        styles.variantChipText,
                        v.selected && styles.variantChipTextSelected,
                      ]}
                    >
                      {v.option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* 3. DETACHED BOTTOM DRAWER (>70% Screen Height, Universal Flat List Blocks) */}
      <Modal
        visible={briefModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeBriefModal}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={closeBriefModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalSheetWrap}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            >
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Brief</Text>
                <TouchableOpacity
                  style={styles.sheetDoneBtn}
                  onPress={closeBriefModal}
                  accessibilityLabel="Done"
                  accessibilityRole="button"
                >
                  <Text style={styles.sheetDoneText}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Universal Input Row: Text + Mic / Add Button */}
              <View style={styles.briefInputRow}>
                <TextInput
                  style={styles.briefInput}
                  placeholder="Add note (e.g. Pure silk, 4-Muzham)..."
                  placeholderTextColor="#94A3B8"
                  value={newBlock}
                  onChangeText={setNewBlock}
                  onSubmitEditing={addCurrentBlock}
                  returnKeyType="done"
                  autoFocus={true}
                />
                <TouchableOpacity
                  style={styles.briefActionBtn}
                  onPress={newBlock.trim() ? addCurrentBlock : () => void runJevDetection()}
                  accessibilityLabel={newBlock.trim() ? 'Add note' : 'Voice input'}
                  accessibilityRole="button"
                >
                  {detecting ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : newBlock.trim() ? (
                    <Ionicons name="arrow-up-circle" size={26} color="#2563EB" />
                  ) : (
                    <Ionicons name="mic-outline" size={22} color="#2563EB" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Flat List Blocks of Text */}
              <ScrollView
                style={styles.briefBlocksScroll}
                contentContainerStyle={styles.briefBlocksContent}
                keyboardShouldPersistTaps="handled"
              >
                {briefBlocks.length === 0 ? (
                  <View style={styles.briefEmptyWrap}>
                    <Ionicons name="document-text-outline" size={28} color="#CBD5E1" />
                    <Text style={styles.briefEmptyTitle}>No details added yet</Text>
                    <Text style={styles.briefEmptySub}>
                      Type above or tap the microphone to add materials, sizing, options, or notes.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.briefBlocksList}>
                    {briefBlocks.map((block, idx) => (
                      <View key={idx} style={styles.briefBlockRow}>
                        <Text
                          style={styles.briefBlockText}
                          onPress={() => {
                            setNewBlock(block);
                            removeBlock(idx);
                          }}
                        >
                          {block}
                        </Text>
                        <TouchableOpacity
                          style={styles.briefBlockRemoveBtn}
                          onPress={() => removeBlock(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Remove note"
                        >
                          <Ionicons name="close" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );

  if (props.inline) return content;
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  publishHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  publishHeaderDisabled: {
    color: '#94A3B8',
  },

  scrollContent: {
    paddingVertical: 0,
  },

  // 2-Column Table (Inspired by clean list layout)
  twoColumnTable: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  tableRow: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  optionsRow: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  columnLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    width: 100,
  },
  columnValue: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  tableInput: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    textAlign: 'right',
    paddingVertical: 0,
    minWidth: 160,
  },
  numericInput: {
    fontWeight: '700',
    minWidth: 70,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  columnText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    textAlign: 'right',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  codeText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  linkText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },

  // Inline Photo
  photoInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },

  // Inline Stepper
  stepperMiniBtn: {
    width: 30,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  stepperMiniValue: {
    width: 38,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 0,
  },

  // Variant Chips
  variantChipsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  variantChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  variantChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  variantChipText: {
    fontSize: 12,
    color: '#475569',
  },
  variantChipTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },

  // Detached Bottom Sheet Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheetWrap: {
    width: '100%',
    height: '76%',
  },
  modalSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetDoneBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sheetDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },

  // Input Row
  briefInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  briefInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 4,
  },
  briefActionBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Flat List Blocks of Text
  briefBlocksScroll: {
    flex: 1,
  },
  briefBlocksContent: {
    paddingVertical: 4,
  },
  briefBlocksList: {
    gap: 0,
  },
  briefBlockRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  briefBlockText: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    lineHeight: 21,
  },
  briefBlockRemoveBtn: {
    padding: 6,
  },

  // Empty State
  briefEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  briefEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  briefEmptySub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
