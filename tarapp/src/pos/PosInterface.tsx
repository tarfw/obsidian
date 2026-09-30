import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { ActionInterfaceProps } from '@/action-interfaces/types';
import { createOperationKey, harness, HarnessRequestError } from '@/lib/harness';
import { posJournal, type PendingPosAction } from './journal';
import PosForm, { type PosFormSpec } from './PosForm';
import { clearPosProductSession, getPosSession, savePosSession } from './session';
import { cartTotals, minorUnits, money, type CartLine, type PosOverview, type PosRecord, type SaleLine } from './types';

type Section = 'sell' | 'orders' | 'stock' | 'customers';
const sections: { key: Section; label: string }[] = [
  { key: 'sell', label: 'Sell' }, { key: 'orders', label: 'Orders & returns' },
  { key: 'stock', label: 'Stock' }, { key: 'customers', label: 'Customers' },
];

export default function PosInterface(props: ActionInterfaceProps) {
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 760;
  const initialSection = 'sell' as Section;
  const initialOrderId = typeof props.initialInput?.orderId === 'string' ? props.initialInput.orderId : '';
  const savedSession = getPosSession(props.scope);
  const hasSavedProducts = savedSession?.products !== undefined;
  const [section, setSection] = useState<Section>('sell');
  const [history, setHistory] = useState<{ section: Section; search: string; cartOpen: boolean }[]>([]);
  const [overview, setOverview] = useState<PosOverview | null>(() => savedSession?.overview || null);
  const [items, setItems] = useState<PosRecord[]>(() => hasSavedProducts ? savedSession?.products || [] : []);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(!hasSavedProducts);
  const [sellProductsLoaded, setSellProductsLoaded] = useState(hasSavedProducts);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<PosFormSpec | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [customer, setCustomer] = useState<PosRecord | null>(null);
  const [order, setOrder] = useState<PosRecord | null>(null);
  const [draftOrderId, setDraftOrderId] = useState(initialOrderId);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftLoading, setDraftLoading] = useState(Boolean(initialOrderId));
  const [hasMore, setHasMore] = useState(false);
  const [pending, setPending] = useState<PendingPosAction | null>(null);
  const [journalReady, setJournalReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);
  const journal = useRef<Awaited<ReturnType<typeof posJournal>> | null>(null);
  const draftRef = useRef<{ id: string; version: number } | null>(null);
  const draftSignature = useRef('');
  const draftKey = useRef(initialOrderId || createOperationKey('pos.draft'));
  const currency = overview?.summary.currency || 'INR';
  const discountBps = Math.round(Number(discount || 0) * 100);
  const totals = cartTotals(cart, Number.isFinite(discountBps) ? discountBps : 0);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) {
      const cat = String(item.data.category || '').trim();
      if (cat) cats.add(cat);
    }
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return items.filter((item) => String(item.data.category || '').trim() === selectedCategory);
  }, [items, selectedCategory]);

  const reloadOverview = useCallback(async () => {
    const next = await harness.pos<PosOverview>(props.scope, 'overview');
    setOverview(next); return next;
  }, [props.scope]);
  useEffect(() => {
    let alive = true;
    void posJournal(props.scope).then((value) => {
      if (alive) { journal.current = value; setPending(value.read()); setJournalReady(true); }
    }).catch((cause: Error) => { if (alive) setError(cause.message); });
    void harness.pos<PosOverview>(props.scope, 'overview').then((value) => { if (alive) setOverview(value); }).catch((cause: Error) => { if (alive) setError(cause.message); });
    return () => { alive = false; };
  }, [props.scope]);
  useEffect(() => {
    if (!initialOrderId) return;
    let alive = true;
    void (async () => {
      const response = await harness.pos<{ items: PosRecord[] }>(props.scope, 'orders', initialOrderId);
      const draft = response.items.find((item) => item.id === initialOrderId);
      if (!draft || draft.state !== 'open') throw new Error('This order is no longer awaiting payment.');
      const lines = Array.isArray(draft.data.lines) ? draft.data.lines as SaleLine[] : [];
      const products = await Promise.all(lines.map((line) => harness.pos<{ items: PosRecord[] }>(props.scope, 'products', line.productId)));
      const cartLines = lines.map((line, index) => {
        const product = products[index].items.find((item) => item.id === line.productId);
        if (!product) throw new Error(line.title + ' is no longer available.');
        return { product, quantity: line.quantity };
      });
      if (alive) { draftRef.current = { id: draft.id, version: draft.version }; setCart(cartLines); setDiscount(String(Number(draft.data.discountBps || 0) / 100)); setDraftOrderId(draft.id); setCartOpen(true); }
    })().catch((cause: Error) => { if (alive) setError(cause.message); }).finally(() => { if (alive) setDraftLoading(false); });
    return () => { alive = false; };
  }, [initialOrderId, props.scope]);
  useEffect(() => {
    const current = getPosSession(props.scope);
    savePosSession(props.scope, {
      overview: overview || undefined,
      products: section === 'sell' && !search && sellProductsLoaded ? items : current?.products,
      cart,
      discount,
      customer,
    });
  }, [cart, customer, discount, items, overview, props.scope, search, section, sellProductsLoaded]);
  useEffect(() => {
    let alive = true;
    const current = ++requestId.current;
    const timer = setTimeout(() => {
      const cachedProducts = section === 'sell' && !search ? getPosSession(props.scope)?.products : undefined;
      if (cachedProducts === undefined) setLoading(true);
      setError('');
      const resource = section === 'sell' || section === 'stock' ? 'products' : section;
      void harness.pos<{ items: PosRecord[] }>(props.scope, resource, search).then((result) => {
        if (alive && current === requestId.current) {
          setItems(result.items); setHasMore(result.items.length === 100);
          if (section === 'sell' && !search) {
            setSellProductsLoaded(true);
            const existing = getPosSession(props.scope);
            if (existing) savePosSession(props.scope, { ...existing, products: result.items });
          }
        }
      }).catch((cause: Error) => { if (alive && current === requestId.current) setError(cause.message); }).finally(() => { if (alive && current === requestId.current) setLoading(false); });
    }, 180);
    return () => { alive = false; clearTimeout(timer); };
  }, [section, search, props.scope, revision]);
  useEffect(() => {
    if (!cart.length) {
      const draft = draftRef.current;
      if (draft && !draftSaving) {
        draftRef.current = null; draftSignature.current = ''; setDraftOrderId('');
        void harness.executeAction(props.scope, 'pos.order.cancel', { orderId: draft.id, version: draft.version }, createOperationKey('pos.order.cancel')).catch((cause: Error) => setError(cause.message));
      }
      return;
    }
    if (!overview?.settings || draftLoading || form || draftSaving) return;
    const signature = JSON.stringify({ items: cart.map((line) => [line.product.id, line.product.version, line.quantity]), discountBps, customerId: customer?.id || '' });
    if (signature === draftSignature.current) return;
    const timer = setTimeout(() => {
      setDraftSaving(true);
      void harness.executeAction<{ order: PosRecord }>(props.scope, 'pos.order.save', {
        items: cart.map((line) => ({ productId: line.product.id, version: line.product.version, quantity: line.quantity })), discountBps, customerId: customer?.id || '', orderId: draftRef.current?.id, version: draftRef.current?.version, draftKey: draftKey.current,
        submitted: false,
      }, createOperationKey('pos.order.save')).then((result) => {
        draftRef.current = { id: result.order.id, version: result.order.version };
        draftSignature.current = signature;
        setDraftOrderId(result.order.id);
      }).catch((cause: Error) => setError(cause.message)).finally(() => setDraftSaving(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [cart, customer?.id, discountBps, draftLoading, draftSaving, form, overview?.settings, props.scope]);
  const refresh = async () => { await reloadOverview(); setRevision((value) => value + 1); };
  const more = async () => {
    if (loading || !hasMore) return;
    const current = requestId.current;
    setLoading(true);
    try {
      const result = await harness.pos<{ items: PosRecord[] }>(props.scope, section === 'sell' || section === 'stock' ? 'products' : section, search, items.length);
      if (current === requestId.current) { setItems((previous) => [...previous, ...result.items]); setHasMore(result.items.length === 100); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load more.'); }
    finally { setLoading(false); }
  };
  // Persist before sending, so a lost response or app restart cannot create a duplicate payment.
  const execute = async (action: string, input: Record<string, unknown>) => {
    if (!journalReady || !journal.current) throw new Error('Payment recovery is not ready. Reopen POS.');
    const previous = journal.current.read();
    if (previous && JSON.stringify({ action, input }) !== JSON.stringify({ action: previous.action, input: previous.input })) throw new Error('Resolve the pending operation before starting another.');
    const operation = previous || { action, input, key: createOperationKey(action) };
    journal.current.write(operation); setPending(operation);
    try {
      const result = await harness.executeAction(props.scope, action, input, operation.key);
      journal.current.write(null); setPending(null);
      return result;
    } catch (cause) {
      if (cause instanceof HarnessRequestError && (cause.status === 400 || cause.status === 409 || cause.status === 404)) { journal.current.write(null); setPending(null); }
      throw cause;
    }
  };
  const refreshAfterSave = async () => { clearPosProductSession(props.scope); setSellProductsLoaded(false); try { await refresh(); } catch { setError('Saved. Refresh to load the latest records.'); } };
  const saveAction = async (action: string, input: Record<string, unknown>) => { await execute(action, input); await refreshAfterSave(); };
  const recover = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const result = await execute(pending.action, pending.input);
      if (result.order) { setOrder(result.order as PosRecord); setCart([]); setCustomer(null); setDiscount('0'); }
      await refreshAfterSave();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not recover operation.'); }
    finally { setBusy(false); }
  };
  const chooseSection = (next: Section) => {
    setHistory((previous) => [...previous, { section, search, cartOpen }]);
    setSearch(''); setSection(next); setCartOpen(false); setOrder(null);
  };
  const back = () => {
    if (order) { setOrder(null); return; }
    if (cartOpen && !wide) { setCartOpen(false); return; }
    const previous = history.at(-1);
    if (previous) {
      setHistory((value) => value.slice(0, -1));
      setSection(previous.section); setSearch(previous.search); setCartOpen(previous.cartOpen);
      return;
    }
    if (draftOrderId) props.onSuccess({});
    else if (cart.length) Alert.alert('Leave this sale?', 'The current cart will be discarded.', [{ text: 'Keep selling', style: 'cancel' }, { text: 'Leave', onPress: () => props.onSuccess({}) }]);
    else props.onSuccess({});
  };
  const selectCustomer = (selected: PosRecord) => {
    setCustomer(selected);
    const index = history.map((entry) => entry.section).lastIndexOf('sell');
    if (index >= 0) {
      const previous = history[index];
      setHistory((value) => value.slice(0, index));
      setSection('sell'); setSearch(previous.search); setCartOpen(previous.cartOpen); setOrder(null);
    } else chooseSection('sell');
  };
  const add = (product: PosRecord) => {
    const existing = cart.find((line) => line.product.id === product.id);
    if ((existing?.quantity || 0) >= Number(product.data.stock)) {
      Alert.alert('Out of stock', 'Add or receive stock from the Stock flow before selling this product.');
      return;
    }
    setCart((previous) => existing ? previous.map((line) => line.product.id === product.id ? { product, quantity: line.quantity + 1 } : line) : [...previous, { product, quantity: 1 }]);
  };
  const changeQuantity = (id: string, delta: number) => setCart((previous) => previous.map((line) => line.product.id === id ? { ...line, quantity: Math.min(Number(line.product.data.stock), line.quantity + delta) } : line).filter((line) => line.quantity > 0));
  const setup = () => setForm({ title: 'Manage POS', submit: 'Save store', fields: [
    { key: 'name', label: 'Store name', value: overview?.settings?.title },
    { key: 'location', label: 'Location', value: String(overview?.settings?.data.location || '') },
    { key: 'currency', label: 'Currency', value: currency, hint: 'INR, USD, EUR or GBP. Locked once products exist.' },
    { key: 'timezone', label: 'Timezone', value: String(overview?.settings?.data.timezone || 'Asia/Kolkata') },
    { key: 'receiptFooter', label: 'Receipt footer', value: String(overview?.settings?.data.receiptFooter || 'Thank you for shopping with us.') },
  ], save: (values) => saveAction('pos.setup', values) });
  const productForm = (product?: PosRecord) => {
    void (async () => {
      const stored = product?.data.contentKey ? (await harness.posProductContent(props.scope, product.id)).content : {};
      const value = (key: string) => typeof stored[key] === 'string' ? String(stored[key]) : '';
      let savedProduct = product;
      setForm({ title: product ? 'Edit product' : 'Add product', product: true, submit: 'Save product', fields: [
        { key: 'title', label: 'Product name', value: product?.title },
        { key: 'price', label: 'Price', numeric: true, value: String(Number(product?.data.price || 0) / 100) },
        ...(!product ? [{ key: 'stock', label: 'Stock', numeric: true, value: '0' }] : []),
        { key: 'imageUrl', label: 'Image', value: String(product?.data.imageUrl || ''), image: true },
        { key: 'shortDescription', label: 'Summary', value: String(product?.data.shortDescription || ''), advanced: true },
        { key: 'sku', label: 'SKU', value: String(product?.data.sku || ''), advanced: true },
        { key: 'barcode', label: 'Barcode', value: String(product?.data.barcode || ''), advanced: true },
        { key: 'category', label: 'Category', value: String(product?.data.category || ''), advanced: true },
        { key: 'brand', label: 'Brand', value: String(product?.data.brand || ''), advanced: true },
        { key: 'variant', label: 'Variant', value: String(product?.data.variant || ''), advanced: true },
        { key: 'unit', label: 'Unit', value: String(product?.data.unit || ''), advanced: true },
        { key: 'cost', label: 'Cost', numeric: true, value: String(Number(product?.data.cost || 0) / 100), advanced: true },
        { key: 'tax', label: 'Tax', numeric: true, value: String(Number(product?.data.taxBps || 0) / 100), advanced: true },
        { key: 'supplier', label: 'Supplier', value: String(product?.data.supplier || ''), advanced: true },
        { key: 'lowStock', label: 'Reorder', numeric: true, value: String(product?.data.lowStock ?? 5), advanced: true },
        { key: 'sourceUrl', label: 'Source', value: value('sourceUrl'), advanced: true },
        { key: 'longDescription', label: 'Description', value: value('longDescription'), multiline: true, advanced: true },
        { key: 'specifications', label: 'Specs', value: value('specifications'), multiline: true, advanced: true },
        { key: 'sourceNotes', label: 'Notes', value: value('sourceNotes'), multiline: true, advanced: true },
      ], save: async (values) => {
        const result = await execute('pos.product.save', { ...values, id: savedProduct?.id, version: savedProduct?.version, price: minorUnits(values.price), cost: minorUnits(values.cost || '0'), taxBps: minorUnits(values.tax || '0'), stock: Number(values.stock || 0), lowStock: Number(values.lowStock || 0) });
        savedProduct = result.product as PosRecord;
        const hasContent = Boolean(savedProduct.data.contentKey || values.sourceUrl || values.longDescription || values.specifications || values.sourceNotes);
        if (hasContent) await execute('pos.product.content.save', { productId: savedProduct.id, version: savedProduct.version, sourceUrl: values.sourceUrl, longDescription: values.longDescription, specifications: values.specifications, sourceNotes: values.sourceNotes });
        await refreshAfterSave();
      } });
    })().catch((cause: Error) => setError(cause.message));
  };
  const adjust = (product: PosRecord) => setForm({ title: 'Adjust ' + product.title, submit: 'Update stock', fields: [
    { key: 'delta', label: 'Quantity change', hint: 'Positive to receive stock. Negative to remove stock.' },
    { key: 'reason', label: 'Reason' },
  ], save: (values) => saveAction('pos.stock.adjust', { productId: product.id, version: product.version, delta: Number(values.delta), reason: values.reason }) });
  const customerForm = (existing?: PosRecord) => setForm({ title: existing ? 'Edit customer' : 'Add customer', submit: 'Save customer', fields: [
    { key: 'title', label: 'Name', value: existing?.title }, { key: 'phone', label: 'Phone', value: String(existing?.data.phone || '') }, { key: 'email', label: 'Email', value: String(existing?.data.email || '') },
  ], save: (values) => saveAction('pos.customer.save', { ...values, id: existing?.id, version: existing?.version }) });
  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart) {
      map[line.product.id] = (map[line.product.id] || 0) + line.quantity;
    }
    return map;
  }, [cart]);

  const registerForm = () => {
    const session = overview?.register;
    setForm({ title: session ? 'Close register' : 'Open register', submit: session ? 'Close register' : 'Open register', fields: [
      { key: 'amount', label: session ? 'Cash counted' : 'Opening cash', numeric: true, value: '0', hint: session ? 'Expected cash: ' + money(session.expected, currency) : 'Cash in the drawer before sales.' },
    ], save: (values) => saveAction(session ? 'pos.register.close' : 'pos.register.open', session ? { counted: minorUnits(values.amount), registerId: session.id } : { opening: minorUnits(values.amount) }) });
  };
  const saveForNow = () => {
    if (!cart.length) return;
    if (!Number.isSafeInteger(discountBps) || discountBps < 0 || discountBps > 10000) { Alert.alert('Invalid discount', 'Enter a percentage from 0 to 100.'); return; }
    setForm({ title: 'Order details', submit: 'Save order', fields: [
      { key: 'orderType', label: 'Order type', value: 'counter', hint: 'counter, dine-in, takeaway or delivery' },
      { key: 'table', label: 'Table number', hint: 'Optional' },
      { key: 'destination', label: 'Delivery address', hint: 'Required for delivery orders.' },
    ], save: async (values) => {
      const result = await execute('pos.order.save', { items: cart.map((line) => ({ productId: line.product.id, version: line.product.version, quantity: line.quantity })), discountBps, customerId: customer?.id, orderId: draftRef.current?.id, version: draftRef.current?.version, draftKey: draftKey.current, orderType: values.orderType, table: values.table, destination: values.destination, submitted: true });
      const saved = result.order as PosRecord;
      draftRef.current = { id: saved.id, version: saved.version }; draftSignature.current = JSON.stringify({ items: cart.map((line) => [line.product.id, line.product.version, line.quantity]), discountBps, customerId: customer?.id || '' }); setDraftOrderId(saved.id);
    } });
  };
  const checkout = (method: 'cash' | 'upi') => {
    if (!cart.length) return;
    if (!overview?.register) {
      Alert.alert('Open register', 'Open the register before taking a payment.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open register', onPress: registerForm }]);
      return;
    }
    if (!Number.isSafeInteger(discountBps) || discountBps < 0 || discountBps > 10000) { Alert.alert('Invalid discount', 'Enter a percentage from 0 to 100.'); return; }
    setForm({ title: method === 'cash' ? 'Cash payment' : 'UPI payment', submit: method === 'cash' ? 'Confirm cash received' : 'Confirm UPI received',
      fields: method === 'cash'
        ? [{ key: 'tendered', label: 'Cash received', numeric: true, value: String(totals.total / 100), hint: 'Amount due: ' + money(totals.total, currency) }]
        : [{ key: 'reference', label: 'UPI transaction reference', hint: 'Check receipt in your UPI account before confirming. TAR records your confirmation; it does not verify the bank payment.' }],
      save: async (values) => {
        const result = await execute('pos.checkout', { items: cart.map((line) => ({ productId: line.product.id, version: line.product.version, quantity: line.quantity })),
          method, discountBps, expectedTotal: totals.total, tendered: method === 'cash' ? minorUnits(values.tendered) : totals.total,
          reference: values.reference || '', received: method === 'upi', customerId: customer?.id, orderId: draftOrderId || undefined });
        setOrder(result.order as PosRecord); setCart([]); setCustomer(null); setDiscount('0'); setCartOpen(false); setDraftOrderId(''); draftRef.current = null; draftSignature.current = '';
        await refreshAfterSave();
      },
    });
  };
  const refund = (sale: PosRecord) => setForm({ title: 'Return sale', submit: 'Confirm payment returned', fields: [
    ...(sale.data.lines as SaleLine[]).map((line) => ({ key: line.productId, label: line.title + ' · quantity to return', numeric: true, value: String(line.quantity - Number((sale.data.returnedQuantities as Record<string, number> | undefined)?.[line.productId] || 0)) })),
    { key: 'reason', label: 'Return reason', hint: 'Choose quantities above. Return the corresponding payment to the customer before confirming.' },
    { key: 'restock', label: 'Restock items? yes / no', value: 'yes' },
    ...(sale.data.method === 'upi' ? [{ key: 'reference', label: 'UPI refund reference' }] : []),
  ], summary: (values) => {
    let amount = 0;
    for (const line of sale.data.lines as SaleLine[]) {
      const before = Number((sale.data.returnedQuantities as Record<string, number> | undefined)?.[line.productId] || 0);
      const quantity = Number(values[line.productId]);
      if (!Number.isInteger(quantity) || quantity < 0 || quantity + before > line.quantity) return 'Enter valid return quantities.';
      amount += Math.round(line.total * (before + quantity) / line.quantity) - Math.round(line.total * before / line.quantity);
    }
    return 'Return ' + money(amount, String(sale.data.currency));
  }, save: async (values) => {
    if (!['yes', 'no'].includes(values.restock.toLowerCase())) throw new Error('Enter yes or no for restocking.');
    const quantities = Object.fromEntries((sale.data.lines as SaleLine[]).map((line) => [line.productId, Number(values[line.productId])]));
    const result = await execute('pos.refund', { orderId: sale.id, quantities, reason: values.reason, restock: values.restock.toLowerCase() === 'yes', returned: true, reference: values.reference });
    setOrder(result.order as PosRecord); await refreshAfterSave();
  } });
  const resumeOrder = async (selected: PosRecord) => {
    setBusy(true);
    setError('');
    try {
      const lines = Array.isArray(selected.data.lines) ? selected.data.lines as SaleLine[] : [];
      const products = await Promise.all(lines.map((line) => harness.pos<{ items: PosRecord[] }>(props.scope, 'products', line.productId)));
      const next = lines.map((line, index) => {
        const product = products[index].items.find((item) => item.id === line.productId);
        if (!product) throw new Error(line.title + ' is no longer available.');
        return { product, quantity: line.quantity };
      });
      const customerId = typeof selected.data.customerId === 'string' ? selected.data.customerId : '';
      const customers = customerId ? await harness.pos<{ items: PosRecord[] }>(props.scope, 'customers', customerId) : null;
      draftRef.current = { id: selected.id, version: selected.version };
      draftSignature.current = JSON.stringify({ items: next.map((line) => [line.product.id, line.product.version, line.quantity]),
        discountBps: Number(selected.data.discountBps || 0), customerId });
      setDraftOrderId(selected.id); setCart(next); setCustomer(customers?.items.find((item) => item.id === customerId) || null);
      setDiscount(String(Number(selected.data.discountBps || 0) / 100)); setSection('sell'); setOrder(null); setCartOpen(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the order.'); }
    finally { setBusy(false); }
  };
  const acceptOrder = async (selected: PosRecord) => {
    setBusy(true);
    try {
      const result = await execute('pos.order.accept', { orderId: selected.id, version: selected.version });
      setOrder(result.order as PosRecord); await refreshAfterSave();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not accept the order.'); }
    finally { setBusy(false); }
  };
  const rejectOrder = (selected: PosRecord) => setForm({ title: 'Reject order', submit: 'Reject order', fields: [
    { key: 'reason', label: 'Reason' },
  ], save: async (values) => {
    const result = await execute('pos.order.reject', { orderId: selected.id, version: selected.version, reason: values.reason });
    setOrder(result.order as PosRecord); await refreshAfterSave();
  } });
  const shareReceipt = async (sale: PosRecord) => {
    const lines = sale.data.lines as SaleLine[];
    const code = String(sale.data.currency);
    await Share.share({ message: [
      String(sale.data.storeName), String(sale.data.location || ''), 'Receipt ' + sale.id, new Date(sale.createdAt).toLocaleString(),
      ...lines.map((line) => line.quantity + ' × ' + line.title + '  ' + money(line.total, code)),
      'Discount: ' + money(Number(sale.data.discount), code), 'Tax: ' + money(Number(sale.data.tax), code),
      'Total: ' + money(Number(sale.data.total), code), String(sale.data.method).toUpperCase() + ' · ' + sale.state,
      String(sale.data.receiptFooter || ''),
    ].join('\n') });
  };

  const cartView = <View style={[styles.cart, wide && styles.cartWide]}>
    <View style={styles.panelHeading}><Text style={styles.heading}>Cart · {count}</Text><TouchableOpacity style={styles.touch} onPress={() => { setCart([]); setDiscount('0'); setCustomer(null); }}><Text style={styles.muted}>Clear</Text></TouchableOpacity></View>
    <TouchableOpacity style={styles.customer} onPress={() => chooseSection('customers')}><Ionicons name="person-add-outline" size={18} color="#565b60" /><Text style={styles.body}>{customer?.title || 'Add customer'}</Text></TouchableOpacity>
    <ScrollView style={styles.cartLines}>
      {cart.map((line) => {
        const unitPrice = Number(line.product.data.price);
        const lineGross = unitPrice * line.quantity;
        return (
          <View key={line.product.id} style={styles.line}>
            <View style={styles.copy}>
              <Text style={styles.body}>{line.product.title}</Text>
              <Text style={styles.muted}>{money(unitPrice, currency)} {line.quantity > 1 ? `· ${money(lineGross, currency)}` : ''}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity accessibilityLabel={'Remove one ' + line.product.title} style={styles.stepperBtn} onPress={() => changeQuantity(line.product.id, -1)}>
                <Ionicons name="remove" size={16} color="#202223" />
              </TouchableOpacity>
              <Text style={styles.stepperQty}>{line.quantity}</Text>
              <TouchableOpacity accessibilityLabel={'Add one ' + line.product.title} style={styles.stepperBtn} onPress={() => changeQuantity(line.product.id, 1)}>
                <Ionicons name="add" size={16} color="#202223" />
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel={'Delete ' + line.product.title} style={styles.removeBtn} onPress={() => changeQuantity(line.product.id, -line.quantity)}>
                <Ionicons name="close" size={16} color="#8c9196" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      {!cart.length ? <Text style={styles.empty}>Add products to start a sale.</Text> : null}
    </ScrollView>
    <View style={styles.totals}>
      <View style={styles.totalRow}><Text style={styles.muted}>Discount %</Text><TextInput accessibilityLabel="Discount percentage" style={styles.discount} value={discount} keyboardType="decimal-pad" onChangeText={setDiscount} /></View>
      <Total label="Subtotal" value={money(totals.subtotal, currency)} />
      <Total label="Discount" value={'−' + money(totals.discount, currency)} />
      <Total label="Tax" value={money(totals.tax, currency)} />
      <Total label="Total" value={money(totals.total, currency)} bold />
      <View style={styles.payments}>
        <Button title="Order details" disabled={!cart.length || busy || draftSaving} secondary onPress={saveForNow} />
        <Button title={`Cash (${money(totals.total, currency)})`} disabled={!cart.length || busy || draftSaving} onPress={() => checkout('cash')} />
        <Button title="UPI / QR" disabled={!cart.length || busy || draftSaving} onPress={() => checkout('upi')} />
      </View>
    </View>
  </View>;

  return <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={back}>
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Back" style={styles.touch} onPress={back}><Ionicons name="chevron-back" size={24} color="#1C2430" /></TouchableOpacity>
        <Text numberOfLines={1} style={styles.headerTitle}>Point of sale</Text>
        <TouchableOpacity style={styles.drawerBadge} onPress={registerForm}>
          <Ionicons name={overview?.register ? 'cash' : 'lock-closed-outline'} size={14} color={overview?.register ? '#16A34A' : '#64748B'} />
          <Text style={[styles.drawerBadgeText, overview?.register ? styles.drawerBadgeActive : null]}>
            {overview?.register ? `Drawer: ${money(overview.register.expected, currency)}` : 'Open drawer'}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      {pending && !form ? <View style={styles.recovery}><Text style={styles.body}>An operation needs confirmation.</Text><Button title={busy ? 'Checking…' : 'Resolve pending operation'} disabled={busy} onPress={() => void recover()} /></View> : null}
      {!overview ? <View style={styles.center}><ActivityIndicator /></View> : !overview.settings ? <View style={styles.center}><Text style={styles.heading}>Set up your store</Text><Text style={styles.empty}>Name, currency and location. Then add your products.</Text>{overview.canManage ? <Button title="Set up POS" onPress={setup} /> : <Text style={styles.muted}>Ask a workspace admin to set up POS.</Text>}</View> : order ? <ScrollView contentContainerStyle={[styles.receipt, { paddingBottom: insets.bottom + 32 }]}>
        <Ionicons name={order.state === 'refunded' || order.state === 'cancelled' ? 'return-down-back-outline' : 'checkmark-circle'} size={38} color={order.state === 'cancelled' ? '#b42318' : '#008060'} />
        <Text style={styles.receiptTitle}>{order.state === 'open' ? 'Open order' : order.state === 'cancelled' ? 'Order cancelled' : order.state === 'refunded' ? 'Sale returned' : order.state === 'partially_refunded' ? 'Partially returned' : 'Payment recorded'}</Text>
        <Text style={styles.muted}>{order.id.slice(-8).toUpperCase()} · {new Date(order.createdAt).toLocaleString()}</Text>
        {order.state === 'open' ? <Text style={styles.muted}>Review: {String(order.data.approval || 'pending')}{order.data.orderType === 'delivery' ? ' · Delivery: ' + String(order.data.delivery || 'unassigned') : ''}</Text> : null}
        {order.data.table ? <Text style={styles.muted}>Table {String(order.data.table)}</Text> : null}
        {order.data.destination ? <Text style={styles.muted}>Deliver to {String(order.data.destination)}</Text> : null}
        {(Array.isArray(order.data.lines) ? order.data.lines as SaleLine[] : []).map((line) => <Total key={line.productId} label={line.quantity + ' × ' + line.title} value={money(line.total, String(order.data.currency))} />)}
        <Total label="Total" value={money(Number(order.data.total), String(order.data.currency))} bold />
        {order.state !== 'open' && order.state !== 'cancelled' ? <><Total label="Change" value={money(Number(order.data.change || 0), String(order.data.currency))} /><Total label="Returned" value={money(Number(order.data.refundedTotal || 0), String(order.data.currency))} /><Text style={styles.muted}>{String(order.data.method).toUpperCase()}{order.data.customerName ? ' · ' + order.data.customerName : ''}</Text><Button title="Share receipt" onPress={() => { void shareReceipt(order).catch(() => Alert.alert('Could not share receipt')); }} /></> : null}
        {order.state === 'open' ? <><Button title="Continue order" disabled={busy} onPress={() => { void resumeOrder(order); }} />
          {overview.canManage && order.data.approval === 'pending' ? <><Button title="Accept order" disabled={busy} secondary onPress={() => { void acceptOrder(order); }} /><Button title="Reject order" disabled={busy} secondary onPress={() => rejectOrder(order)} /></> : null}</> : null}
        {overview.canManage && (order.state === 'paid' || order.state === 'partially_refunded') ? <Button title="Return sale" secondary onPress={() => refund(order)} /> : null}
        <Button title="Done" secondary onPress={() => { setOrder(null); setRevision((value) => value + 1); }} />
      </ScrollView> : <View style={styles.main}>
        {(section !== 'sell' || wide || !cartOpen) ? <View style={styles.catalog}>
          {section !== 'sell' ? <View style={styles.sectionHeading}><Text style={styles.heading}>{sections.find((item) => item.key === section)?.label}</Text>{section === 'customers' ? <TouchableOpacity style={styles.touch} onPress={() => customerForm()}><Ionicons name="add" size={24} /></TouchableOpacity> : null}</View> : null}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={17} color="#64748B" />
            <TextInput
              accessibilityLabel="Search"
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#94A3B8"
              placeholder={section === 'sell' ? 'Search products or scan barcode…' : 'Search ' + section}
              style={styles.searchInput}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8} style={styles.searchClear}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
          {section === 'sell' && categories.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>{cat === 'All' ? 'All Items' : cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
          <FlatList key={section === 'sell' ? 'grid' : 'list'} data={section === 'sell' ? filteredItems : items} numColumns={section === 'sell' ? (wide ? 3 : 2) : 1} keyExtractor={(item) => item.id} contentContainerStyle={[styles.products, { paddingBottom: (count > 0 ? 84 : 24) + insets.bottom }]} ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.empty}>{loading ? 'Loading products…' : search ? 'No matching products.' : 'No products in catalog yet.'}</Text>{!loading && !search && overview.canManage && section === 'sell' ? <Button title="Add product" onPress={() => productForm()} /> : null}</View>} ListFooterComponent={hasMore ? <TouchableOpacity style={styles.loadMore} onPress={() => void more()}><Text>{loading ? 'Loading…' : 'Load more'}</Text></TouchableOpacity> : null} renderItem={({ item }) => {
            if (section === 'sell') {
              const inCartQty = cartQuantities[item.id] || 0;
              const isOutOfStock = Number(item.data.stock) < 1;
              const isLowStock = !isOutOfStock && Number(item.data.stock) <= Number(item.data.lowStock || 0);
              return (
                <TouchableOpacity
                  accessibilityLabel={item.title + (isOutOfStock ? ', out of stock' : '')}
                  style={[styles.productTile, inCartQty > 0 && styles.productTileInCart, isOutOfStock && styles.disabled]}
                  onPress={() => add(item)}
                >
                  <View style={styles.productTileTop}>
                    {item.data.imageUrl ? (
                      <Image source={{ uri: String(item.data.imageUrl) }} style={styles.productThumb} resizeMode="cover" />
                    ) : null}
                    <Text numberOfLines={2} style={styles.productName}>{item.title}</Text>
                    {inCartQty > 0 ? (
                      <View style={styles.productQtyBadge}>
                        <Text style={styles.productQtyBadgeText}>{inCartQty}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.productTileBottom}>
                    <Text style={styles.price}>{money(Number(item.data.price), currency)}</Text>
                    {isLowStock ? <Text style={styles.lowStockText}>Low ({String(item.data.stock)})</Text> : isOutOfStock ? <Text style={styles.outOfStockText}>Out of stock</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity style={styles.listRow} onPress={() => {
                if (section === 'orders') setOrder(item);
                else if (section === 'customers') Alert.alert(item.title, String(item.data.phone || item.data.email || ''), [{ text: 'Add to sale', onPress: () => { selectCustomer(item); } }, { text: 'Purchase history', onPress: () => { chooseSection('orders'); setSearch(item.id); } }, { text: 'Edit', onPress: () => customerForm(item) }]);
              }}><View style={styles.copy}><Text style={styles.body}>{section === 'orders' ? item.id.slice(-8).toUpperCase() : item.title}</Text><Text style={styles.muted}>{section === 'customers' ? String(item.data.phone || item.data.email || 'Select for this sale') : new Date(item.createdAt).toLocaleDateString() + ' · ' + item.state}</Text></View>{section === 'orders' ? <Text style={styles.price}>{money(Number(item.data.total), currency)}</Text> : null}<Ionicons name="chevron-forward" size={16} color="#8c9196" /></TouchableOpacity>
            );
          }} />
        </View> : null}
        {section === 'sell' && ((wide && count > 0) || cartOpen) ? cartView : null}
      </View>}
      {overview?.settings && !order && section === 'sell' && !wide && !cartOpen && count > 0 ? (
        <TouchableOpacity style={[styles.cartBar, { bottom: insets.bottom + 12 }]} onPress={() => setCartOpen(true)}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{count}</Text></View>
            <Text style={styles.cartBarTotal}>{money(totals.total, currency)}</Text>
          </View>
          <View style={styles.cartBarRight}>
            <Text style={styles.cartBarAction}>Review & Settle ›</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      {form ? <PosForm form={form} onClose={() => setForm(null)} /> : null}
    </View>
  </Modal>;
}
function Total({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) { return <View style={styles.totalRow}><Text style={bold ? styles.heading : styles.muted}>{label}</Text><Text style={bold ? styles.heading : styles.body}>{value}</Text></View>; }
function Button({ title, onPress, disabled, secondary }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) { return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 52, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E8ECF1', paddingHorizontal: 12 },
  touch: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1C2430', marginLeft: 6 },
  searchBar: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1C2430',
    height: 44,
    paddingVertical: 0,
  },
  searchClear: {
    padding: 2,
  },
  copy: { flex: 1 },
  drawerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' },
  drawerBadgeText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  drawerBadgeActive: { color: '#16A34A', fontWeight: '700' },
  main: { flex: 1, flexDirection: 'row' },
  catalog: { flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 48 },
  heading: { fontSize: 16, fontWeight: '700', color: '#1C2430' },
  body: { fontSize: 14, color: '#1C2430' },
  muted: { fontSize: 12, color: '#697586', lineHeight: 18 },
  categoryScroll: { flexGrow: 0, paddingHorizontal: 10, marginTop: 8, marginBottom: 8 },
  categoryList: { gap: 6, alignItems: 'center', flexDirection: 'row' },
  categoryPill: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9' },
  categoryPillActive: { backgroundColor: '#1C2430' },
  categoryPillText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  categoryPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  products: { paddingHorizontal: 8, paddingBottom: 80 },
  productTile: {
    flex: 1,
    margin: 4,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    justifyContent: 'space-between',
    minHeight: 90,
    maxWidth: '48%',
  },
  productTileInCart: {
    borderColor: '#3157A8',
    backgroundColor: '#F7F9FD',
  },
  productTileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  productThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C2430',
    flex: 1,
    lineHeight: 19,
  },
  productQtyBadge: {
    backgroundColor: '#3157A8',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  productQtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  productTileBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C2430',
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  listRow: { minHeight: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E8ECF1' },
  cart: { flex: 1, backgroundColor: '#FFFFFF' },
  cartWide: { flex: 0, width: 340, borderLeftWidth: 1, borderColor: '#E8ECF1' },
  panelHeading: { height: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customer: { height: 44, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E8ECF1', paddingHorizontal: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  cartLines: { flex: 1 },
  line: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#F1F5F9' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepperBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  stepperQty: { minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#1C2430' },
  removeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  totals: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E8ECF1' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6 },
  discount: { width: 56, height: 32, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, textAlign: 'right', paddingHorizontal: 6, fontSize: 13 },
  payments: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: { backgroundColor: '#1C2430', minHeight: 46, paddingHorizontal: 18, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginVertical: 4, flex: 1 },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
  secondaryText: { color: '#1C2430' },
  disabled: { opacity: 0.4 },
  cartBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    height: 52,
    backgroundColor: '#1C2430',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartBadge: {
    backgroundColor: '#3157A8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cartBarTotal: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBarAction: {
    color: '#93C5FD',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: { alignItems: 'center', padding: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  empty: { paddingVertical: 24, paddingHorizontal: 16, textAlign: 'center', color: '#697586', fontSize: 13, lineHeight: 20 },
  receipt: { padding: 24, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  receiptTitle: { fontSize: 22, fontWeight: '700', color: '#1C2430' },
  error: { padding: 12, backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 13, color: '#DC2626' },
  loadMore: { height: 44, alignItems: 'center', justifyContent: 'center' },
  recovery: { padding: 12, backgroundColor: '#FFFBEB' },
});
