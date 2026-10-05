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
  price: string;
  stock: string;
}

const COMMON_CATEGORIES = [
  'Kaithari Pattu Selaigal',
  'Cotton Sarees',
  'Dhotis & Angavastram',
  'Handloom Fabrics',
  'Groceries & Provisions',
  'Spices & Masalas',
  'Sweets & Snacks',
  'Brass & Handicrafts',
  'General Merchandise',
];

const GST_SLABS = [
  { label: '0%', bps: 0 },
  { label: 'GST 5%', bps: 500 },
  { label: 'GST 12%', bps: 1200 },
  { label: 'GST 18%', bps: 1800 },
  { label: 'GST 28%', bps: 2800 },
];

export default function ItemInterface(props: ActionInterfaceProps) {
  if (!props.visible) return null;
  return <ItemForm {...props} />;
}

function ItemForm(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();

  // Core product attributes
  const [photo, setPhoto] = useState<{ uri: string; width: number; height: number; fileName: string } | null>(null);
  const [name, setName] = useState(String(props.initialInput?.name || ''));
  const [category, setCategory] = useState(String(props.initialInput?.category || 'Kaithari Pattu Selaigal'));
  const [price, setPrice] = useState(props.initialInput?.price !== undefined ? String(Number(props.initialInput.price) / 100) : '8200');
  const [mrp, setMrp] = useState(props.initialInput?.mrp !== undefined ? String(Number(props.initialInput.mrp) / 100) : '9500');
  const [stock, setStock] = useState(props.initialInput?.stock !== undefined ? String(props.initialInput.stock) : '12');
  const [taxBps, setTaxBps] = useState<number>(Number(props.initialInput?.tax ?? 500));
  const [unit, setUnit] = useState(String(props.initialInput?.unit || 'piece'));

  // Jev System One 1-tap variant detection
  const [variantPrompt, setVariantPrompt] = useState('4-Muzham, 8-Muzham');
  const [detectedDimension, setDetectedDimension] = useState<string>('length');
  const [detecting, setDetecting] = useState(false);
  const [variants, setVariants] = useState<VariantItem[]>([
    { id: '1', option: '4-Muzham', dimension: 'length', selected: true, price: '4500', stock: '5' },
    { id: '2', option: '8-Muzham', dimension: 'length', selected: true, price: '8200', stock: '7' },
  ]);

  // Modals & UI controls
  const [categoryModal, setCategoryModal] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantItem | null>(null);

  // Formatted calculations
  const priceNum = Number(price.replace(/,/g, '')) || 0;
  const mrpNum = Number(mrp.replace(/,/g, '')) || 0;
  const discountPercent = useMemo(() => {
    if (mrpNum > priceNum && mrpNum > 0) {
      return Math.round(((mrpNum - priceNum) / mrpNum) * 100);
    }
    return 0;
  }, [priceNum, mrpNum]);

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
        const cleanName = asset.fileName || `product_${Date.now()}.jpg`;
        setPhoto({
          uri: asset.uri,
          width: asset.width || 1200,
          height: asset.height || 1200,
          fileName: cleanName,
        });
      }
    } catch {
      Alert.alert('Could not select image', 'Please check image permissions and try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission required', 'Please enable camera permissions to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const cleanName = `camera_${Date.now()}.jpg`;
        setPhoto({
          uri: asset.uri,
          width: asset.width || 1200,
          height: asset.height || 1200,
          fileName: cleanName,
        });
      }
    } catch {
      Alert.alert('Camera unavailable', 'Could not open camera.');
    }
  };

  const showPhotoOptions = () => {
    Alert.alert('Product Photograph', 'Choose an option', [
      { text: 'Choose from Gallery', onPress: () => void pickPhoto() },
      { text: 'Take Photo', onPress: () => void takePhoto() },
      ...(photo ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setPhoto(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  // 1-Tap Jev Variant Detection
  const handleDetectVariants = async () => {
    if (!variantPrompt.trim()) {
      Alert.alert('Variant Prompt', 'Enter options such as "4-Muzham, 8-Muzham" or "S, M, L"');
      return;
    }
    setDetecting(true);
    try {
      const result = await harness.detectVariants(props.scope, {
        product: name.trim() || 'Product',
        input: variantPrompt.trim(),
        trade: category.toLowerCase(),
      });

      if (result.variants && result.variants.length > 0) {
        setDetectedDimension(result.dimension);
        const mapped: VariantItem[] = result.variants.map((v, idx) => ({
          id: String(Date.now() + idx),
          option: v.option,
          dimension: v.dimension || result.dimension,
          selected: true,
          price: price,
          stock: String(Math.max(1, Math.floor((Number(stock) || 10) / result.variants.length))),
        }));
        setVariants(mapped);
      } else {
        Alert.alert('No variants detected', 'Please refine your prompt (e.g. "S, M, L" or "100g, 250g")');
      }
    } catch (cause) {
      Alert.alert('Variant Detection', cause instanceof Error ? cause.message : 'Could not detect variants.');
    } finally {
      setDetecting(false);
    }
  };

  const toggleVariant = (id: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  const addManualVariant = () => {
    const optionName = `Option ${variants.length + 1}`;
    setVariants((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        option: optionName,
        dimension: detectedDimension || 'option',
        selected: true,
        price: price,
        stock: '5',
      },
    ]);
  };

  // Adjust stock stepper
  const adjustStock = (delta: number) => {
    const current = parseInt(stock, 10) || 0;
    const next = Math.max(0, current + delta);
    setStock(String(next));
  };

  // Save Product (Draft or Publish)
  const submit = async (status: 'draft' | 'active') => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please provide a product name.');
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      Alert.alert('Price required', 'Please enter a valid selling price.');
      return;
    }

    setSaving(true);
    try {
      const pricePaise = Math.round(priceNum * 100);
      const mrpPaise = mrpNum > 0 ? Math.round(mrpNum * 100) : pricePaise;
      const initialStockCount = Math.max(0, parseInt(stock, 10) || 0);

      const activeVariants = variants
        .filter((v) => v.selected)
        .map((v) => ({
          name: `${trimmedName} (${v.option})`,
          option: v.option,
          dimension: v.dimension || detectedDimension || 'option',
          price: v.price ? Math.round((Number(v.price) || priceNum) * 100) : pricePaise,
          stock: v.stock ? Math.max(0, parseInt(v.stock, 10) || 0) : initialStockCount,
        }));

      const payload = {
        name: trimmedName,
        category: category.trim(),
        price: pricePaise,
        mrp: mrpPaise,
        stock: initialStockCount,
        tax: taxBps,
        unit: unit.trim() || 'piece',
        photoUrl: photo?.uri || '',
        status,
        ...(activeVariants.length > 0 ? { variants: activeVariants } : {}),
      };

      const result = await harness.executeAction(
        props.scope,
        'catalog.item.save',
        payload,
        createOperationKey('catalog.item.save')
      );

      Alert.alert(
        status === 'active' ? 'Product Published' : 'Draft Saved',
        `${trimmedName} is now saved${status === 'active' ? ' and available in Point of Sale & storefront.' : '.'}`,
        [{ text: 'OK', onPress: () => { props.onSuccess(result); props.onClose(); } }]
      );
    } catch (cause) {
      Alert.alert('Could not save product', cause instanceof Error ? cause.message : 'Please check connection and retry.');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 1. Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.title}>
            Add Product · {props.contextTitle || props.scope}
          </Text>
        </View>
        <TouchableOpacity
          disabled={saving}
          style={styles.cancelButton}
          onPress={props.onClose}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        {/* 2. 1:1 Photo Box Card */}
        <View style={styles.photoCard}>
          <TouchableOpacity
            style={styles.photoSquare}
            onPress={showPhotoOptions}
            accessibilityLabel="Select 1:1 Product Photo"
            accessibilityRole="button"
          >
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={28} color="#475569" />
                <Text style={styles.photoPlaceholderText}>[+ PHOTO]</Text>
                <Text style={styles.photoSubText}>1:1 Crop</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.photoMetaWrap}>
            <Text numberOfLines={1} style={styles.photoFilename}>
              {photo ? photo.fileName : 'pattu_semparuthi_01.jpg'}
            </Text>
            <Text style={styles.photoSpecs}>
              {photo ? `${photo.width} x ${photo.height} · Square 1:1` : '1200 x 1200 · 1:1 Crop'}
            </Text>
            <View style={styles.r2Badge}>
              <Ionicons name="cloud-done-outline" size={13} color="#15803D" />
              <Text style={styles.r2BadgeText}>
                {photo ? 'Ready · Upload to R2' : 'Uploaded to R2'}
              </Text>
            </View>

            <TouchableOpacity style={styles.changePhotoBtn} onPress={showPhotoOptions}>
              <Text style={styles.changePhotoText}>
                {photo ? 'Change photo' : 'Choose photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Product Name */}
        <View style={styles.fieldSection}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>Product Name *</Text>
            <TouchableOpacity
              onPress={() => setName('Semparuthi Pattu Selai')}
              accessibilityLabel="Sample Name"
            >
              <Text style={styles.presetLink}>Sample</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Semparuthi Pattu Selai"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!saving}
            />
            {name ? (
              <TouchableOpacity onPress={() => setName('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 4. Trade Category Selector */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity
            style={styles.pickerSelector}
            onPress={() => setCategoryModal(true)}
            accessibilityRole="button"
          >
            <Text numberOfLines={1} style={styles.pickerSelectedText}>
              {category || 'Select category'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 5. Dual Pricing (Selling Price & MRP) */}
        <View style={styles.rowFields}>
          <View style={styles.flexField}>
            <Text style={styles.fieldLabel}>Selling Price</Text>
            <View style={styles.currencyInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="8200"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                editable={!saving}
              />
            </View>
            <Text style={styles.helperText}>
              ₹{Number(priceNum).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.flexField}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>MRP</Text>
              {discountPercent > 0 ? (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.currencyInputWrap}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="9500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={mrp}
                onChangeText={setMrp}
                editable={!saving}
              />
            </View>
            <Text style={styles.helperText}>
              ₹{Number(mrpNum).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* 6. Stock & GST Controls */}
        <View style={styles.rowFields}>
          {/* Stock Stepper */}
          <View style={styles.flexField}>
            <Text style={styles.fieldLabel}>Initial Stock</Text>
            <View style={styles.stepperWrap}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => adjustStock(-1)}
                disabled={saving || (parseInt(stock, 10) || 0) <= 0}
              >
                <Ionicons name="remove" size={18} color="#1E293B" />
              </TouchableOpacity>
              <TextInput
                style={styles.stepperInput}
                keyboardType="numeric"
                value={stock}
                onChangeText={setStock}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => adjustStock(1)}
                disabled={saving}
              >
                <Ionicons name="add" size={18} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>{unit} count</Text>
          </View>

          {/* Unit selector */}
          <View style={styles.flexField}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <View style={styles.unitSelector}>
              {(['piece', 'each', 'meter', 'kg'] as const).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, unit === u && styles.unitChipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* GST Tax Slabs */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Tax Rate (GST)</Text>
          <View style={styles.taxSlabRow}>
            {GST_SLABS.map((slab) => {
              const active = taxBps === slab.bps;
              return (
                <TouchableOpacity
                  key={slab.bps}
                  style={[styles.taxChip, active && styles.taxChipActive]}
                  onPress={() => setTaxBps(slab.bps)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.taxChipText, active && styles.taxChipTextActive]}>
                    {slab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 7. VARIANTS (1-Tap Detected via JEV) */}
        <View style={styles.variantSection}>
          <View style={styles.variantHeader}>
            <View style={styles.variantHeaderLeft}>
              <Ionicons name="sparkles" size={15} color="#2563EB" />
              <Text style={styles.variantTitle}>VARIANTS (1-Tap Detected via JEV)</Text>
            </View>
            <View style={styles.jevBadge}>
              <Text style={styles.jevBadgeText}>~100ms</Text>
            </View>
          </View>

          {/* Variant Detection Input */}
          <View style={styles.detectInputRow}>
            <TextInput
              style={styles.detectInput}
              placeholder="e.g. 4-Muzham, 8-Muzham or S, M, L"
              placeholderTextColor="#94A3B8"
              value={variantPrompt}
              onChangeText={setVariantPrompt}
              editable={!detecting && !saving}
            />
            <TouchableOpacity
              style={styles.detectBtn}
              onPress={() => void handleDetectVariants()}
              disabled={detecting || saving}
              accessibilityRole="button"
            >
              {detecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.detectBtnText}>Detect</Text>
              )}
            </TouchableOpacity>
          </View>

          {detectedDimension ? (
            <Text style={styles.detectedDimensionText}>
              Dimension: <Text style={styles.boldText}>{detectedDimension}</Text> (12 Universal Dimensions)
            </Text>
          ) : null}

          {/* Detected / Configured Variant Chips */}
          <View style={styles.variantChipsContainer}>
            {variants.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.variantChip, v.selected && styles.variantChipSelected]}
                onPress={() => toggleVariant(v.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: v.selected }}
              >
                <Ionicons
                  name={v.selected ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={v.selected ? '#2563EB' : '#94A3B8'}
                />
                <Text style={[styles.variantChipLabel, v.selected && styles.variantChipLabelSelected]}>
                  {v.option} (₹{Number(v.price || priceNum).toLocaleString('en-IN')})
                </Text>
                <TouchableOpacity
                  style={styles.variantEditIcon}
                  onPress={() => setEditingVariant(v)}
                >
                  <Ionicons name="pencil" size={13} color={v.selected ? '#2563EB' : '#94A3B8'} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.addVariantChip} onPress={addManualVariant}>
              <Ionicons name="add" size={16} color="#475569" />
              <Text style={styles.addVariantChipText}>Add option</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 8. Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          disabled={saving}
          style={styles.saveDraftBtn}
          onPress={() => void submit('draft')}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <Text style={styles.saveDraftText}>[ Save Draft ]</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          disabled={saving}
          style={styles.savePublishBtn}
          onPress={() => void submit('active')}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.savePublishText}>[ Save & Publish ]</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal visible={categoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Trade Category</Text>
              <TouchableOpacity onPress={() => setCategoryModal(false)}>
                <Ionicons name="close" size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.categoryList}>
              {COMMON_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryItem, category === cat && styles.categoryItemActive]}
                  onPress={() => {
                    setCategory(cat);
                    setCategoryModal(false);
                  }}
                >
                  <Text style={[styles.categoryItemText, category === cat && styles.categoryItemTextActive]}>
                    {cat}
                  </Text>
                  {category === cat ? <Ionicons name="checkmark" size={18} color="#2563EB" /> : null}
                </TouchableOpacity>
              ))}

              <View style={styles.customCategoryRow}>
                <TextInput
                  style={styles.customCategoryInput}
                  placeholder="Or enter custom category..."
                  placeholderTextColor="#94A3B8"
                  value={customCategory}
                  onChangeText={setCustomCategory}
                />
                <TouchableOpacity
                  style={styles.customCategoryAddBtn}
                  onPress={() => {
                    if (customCategory.trim()) {
                      setCategory(customCategory.trim());
                      setCustomCategory('');
                      setCategoryModal(false);
                    }
                  }}
                >
                  <Text style={styles.customCategoryAddText}>Use</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Variant Price/Stock Modal */}
      {editingVariant ? (
        <Modal visible animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.dialogSheet}>
              <Text style={styles.dialogTitle}>Edit Variant: {editingVariant.option}</Text>

              <Text style={styles.dialogLabel}>Variant Price (₹)</Text>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                defaultValue={editingVariant.price}
                onChangeText={(val) => {
                  setVariants((prev) =>
                    prev.map((v) => (v.id === editingVariant.id ? { ...v, price: val } : v))
                  );
                }}
              />

              <Text style={styles.dialogLabel}>Variant Stock</Text>
              <TextInput
                style={styles.dialogInput}
                keyboardType="numeric"
                defaultValue={editingVariant.stock}
                onChangeText={(val) => {
                  setVariants((prev) =>
                    prev.map((v) => (v.id === editingVariant.id ? { ...v, stock: val } : v))
                  );
                }}
              />

              <TouchableOpacity
                style={styles.dialogDoneBtn}
                onPress={() => setEditingVariant(null)}
              >
                <Text style={styles.dialogDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
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
  header: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitleWrap: { flex: 1, marginRight: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
  cancelButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F1F5F9' },
  cancelText: { color: '#475569', fontSize: 14, fontWeight: '600' },

  scrollContent: { padding: 20, gap: 18 },

  // 1:1 Photo Box Card
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  photoSquare: {
    width: 96,
    height: 96,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  photoPlaceholderText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  photoSubText: { fontSize: 10, color: '#94A3B8' },
  photoMetaWrap: { flex: 1, gap: 4 },
  photoFilename: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  photoSpecs: { fontSize: 12, color: '#64748B' },
  r2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
  },
  r2BadgeText: { fontSize: 11, fontWeight: '600', color: '#15803D' },
  changePhotoBtn: { marginTop: 4 },
  changePhotoText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  // Form Fields
  fieldSection: { gap: 6 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  presetLink: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0F172A',
  },
  clearBtn: { padding: 4 },

  pickerSelector: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  pickerSelectedText: { fontSize: 15, color: '#0F172A', fontWeight: '500' },

  rowFields: { flexDirection: 'row', gap: 12 },
  flexField: { flex: 1, gap: 6 },

  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 46,
  },
  currencySymbol: { fontSize: 16, fontWeight: '700', color: '#475569', marginRight: 4 },
  currencyInput: { flex: 1, height: 46, fontSize: 16, fontWeight: '600', color: '#0F172A' },
  helperText: { fontSize: 11, color: '#64748B' },

  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  discountBadgeText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },

  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    height: 46,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 42,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  unitSelector: { flexDirection: 'row', gap: 4, height: 46, alignItems: 'center' },
  unitChip: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  unitChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  unitChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  unitChipTextActive: { color: '#2563EB' },

  taxSlabRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  taxChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  taxChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  taxChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  taxChipTextActive: { color: '#2563EB' },

  // Variants Section
  variantSection: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  variantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  variantHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  variantTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B', letterSpacing: 0.5 },
  jevBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#DBEAFE',
  },
  jevBadgeText: { fontSize: 10, fontWeight: '700', color: '#1E40AF' },

  detectInputRow: { flexDirection: 'row', gap: 8 },
  detectInput: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  detectBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  detectedDimensionText: { fontSize: 12, color: '#64748B' },
  boldText: { fontWeight: '700', color: '#1E293B' },

  variantChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  variantChipSelected: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  variantChipLabel: { fontSize: 13, color: '#475569', fontWeight: '500' },
  variantChipLabelSelected: { color: '#1E3A8A', fontWeight: '700' },
  variantEditIcon: { paddingLeft: 4 },
  addVariantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
  },
  addVariantChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },

  // Bottom Action Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  saveDraftBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  savePublishBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePublishText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Modal Sheet (Category Picker)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  categoryList: { maxHeight: 380 },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  categoryItemActive: { backgroundColor: '#F8FAFC' },
  categoryItemText: { fontSize: 15, color: '#334155' },
  categoryItemTextActive: { fontWeight: '700', color: '#2563EB' },
  customCategoryRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 14 },
  customCategoryInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  customCategoryAddBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCategoryAddText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Dialog Sheet (Edit Variant)
  dialogSheet: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    alignSelf: 'center',
    width: '85%',
  },
  dialogTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  dialogLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 4 },
  dialogInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  dialogDoneBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogDoneText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
