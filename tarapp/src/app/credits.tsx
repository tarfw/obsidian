import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '@/hooks/use-theme';
import { tar, type CreditPack, type CreditWallet } from '@/lib/tar';

const MIN_CREDITS = 1000;
const MAX_CREDITS = 10000;
const STEP_CREDITS = 1000;

const AGENT_RATES = [
  { name: 'Chat / Support Reply', rate: '0.02 cr', inr: '₹0.002' },
  { name: 'Document & Invoice OCR', rate: '0.05 cr', inr: '₹0.005' },
  { name: 'Voice Note to Order', rate: '0.30 cr', inr: '₹0.030' },
  { name: 'Quote / Proposal', rate: '0.25 cr', inr: '₹0.025' },
  { name: 'Tax / Analyst Report', rate: '1.00 cr', inr: '₹0.100' },
  { name: 'Cloud DB Sync (100 ops)', rate: '0.16 cr', inr: '₹0.016' },
  { name: 'Active Owned Workspace', rate: '100 cr / mo', inr: '₹10.00' },
  { name: 'Local SQLite CRUD', rate: '0 cr', inr: 'Free' },
];

export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState(1000);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRates, setShowRates] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [walletResult, packsResult] = await Promise.all([tar.wallet(), tar.packs()]);
      setWallet(walletResult.wallet);
      setPacks(packsResult.packs);
    } catch (caught: any) {
      setError(caught?.message || 'Could not load credits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([tar.wallet(), tar.packs()])
      .then(([walletResult, packsResult]) => {
        if (!active) return;
        setWallet(walletResult.wallet);
        setPacks(packsResult.packs);
      })
      .catch((caught: any) => {
        if (active) setError(caught?.message || 'Could not load credits.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const increment = () => {
    setSelectedCredits((prev) => Math.min(MAX_CREDITS, prev + STEP_CREDITS));
  };

  const decrement = () => {
    setSelectedCredits((prev) => Math.max(MIN_CREDITS, prev - STEP_CREDITS));
  };

  const selectedPrice = Math.round(selectedCredits * 0.1);
  const selectedPriceFormatted = `₹${selectedPrice.toLocaleString('en-IN')}`;

  const resolvedPackId = useMemo(() => {
    const exact = packs.find((p) => p.credits === selectedCredits && p.id.startsWith('topup-'));
    if (exact) return exact.id;
    if (selectedCredits <= 1000) return 'topup-starter-1000';
    if (selectedCredits <= 5000) return 'topup-growth-5000';
    return 'topup-scale-10000';
  }, [packs, selectedCredits]);

  const buySelected = async () => {
    setBuying(true);
    setError(null);
    try {
      const order = await tar.createPaymentOrder(resolvedPackId);
      if (!order.checkoutUrl) throw new Error('Checkout is unavailable.');
      await WebBrowser.openBrowserAsync(order.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      await load(true);
    } catch (caught: any) {
      setError(caught?.message || 'Could not start checkout.');
    } finally {
      setBuying(false);
    }
  };

  const grantDevelopmentCredits = async () => {
    setGranting(true);
    setError(null);
    try {
      await tar.grantDevelopmentCredits(selectedCredits);
      await load(true);
    } catch (caught: any) {
      setError(caught?.message || 'Could not add test credits.');
    } finally {
      setGranting(false);
    }
  };

  const balance = wallet?.balance ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.text} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.text} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Upper Balance with Subtle Label */}
          <View style={styles.balanceSection}>
            <Text style={[styles.balanceNumber, { color: theme.text }]}>
              {balance.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.balanceSubtitle, { color: theme.textSecondary }]}>
              credits
            </Text>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Bottom-Aligned Controls Area */}
          <View style={styles.bottomSection}>
            {/* Stepper Row */}
            <View style={styles.stepperRow}>
              {/* Minus Button */}
              <Pressable
                onPress={decrement}
                disabled={selectedCredits <= MIN_CREDITS}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    borderColor: theme.border,
                    opacity: selectedCredits <= MIN_CREDITS ? 0.25 : pressed ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel="Decrease amount"
              >
                <Ionicons name="remove" size={22} color={theme.text} />
              </Pressable>

              {/* Counter Value */}
              <Text style={[styles.stepperValueText, { color: theme.text }]}>
                +{selectedCredits.toLocaleString('en-IN')}
              </Text>

              {/* Plus Button */}
              <Pressable
                onPress={increment}
                disabled={selectedCredits >= MAX_CREDITS}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    borderColor: theme.border,
                    opacity: selectedCredits >= MAX_CREDITS ? 0.25 : pressed ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel="Increase amount"
              >
                <Ionicons name="add" size={22} color={theme.text} />
              </Pressable>
            </View>

            {/* Action Row: Pay and Add Test */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => void buySelected()}
                disabled={buying || granting}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: theme.text,
                    opacity: buying ? 0.7 : pressed ? 0.88 : 1,
                    flex: 1,
                  },
                ]}
              >
                {buying ? (
                  <ActivityIndicator color={theme.background} size="small" />
                ) : (
                  <Text style={[styles.actionButtonText, { color: theme.background }]}>
                    Pay {selectedPriceFormatted}
                  </Text>
                )}
              </Pressable>

              {__DEV__ && (
                <Pressable
                  onPress={() => void grantDevelopmentCredits()}
                  disabled={granting || buying}
                  style={({ pressed }) => [
                    styles.testButton,
                    {
                      borderColor: theme.border,
                      opacity: granting ? 0.7 : pressed ? 0.6 : 1,
                    },
                  ]}
                  accessibilityLabel="Add test credits"
                >
                  {granting ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <Text style={[styles.testButtonText, { color: theme.text }]}>
                      +Test
                    </Text>
                  )}
                </Pressable>
              )}
            </View>

            {/* Clean Agent Rates Toggle */}
            <Pressable
              onPress={() => setShowRates((prev) => !prev)}
              style={styles.ratesToggleRow}
              hitSlop={10}
            >
              <Text style={[styles.ratesToggleText, { color: theme.textSecondary }]}>Agent rates</Text>
              <Ionicons name={showRates ? 'chevron-up' : 'chevron-down'} size={15} color={theme.textSecondary} />
            </Pressable>

            {showRates && (
              <View style={styles.ratesList}>
                {AGENT_RATES.map((item, idx) => (
                  <View
                    key={item.name}
                    style={[
                      styles.rateLine,
                      idx < AGENT_RATES.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <Text style={[styles.rateLineName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.rateLineValue, { color: theme.textSecondary }]}>
                      {item.rate} ({item.inr})
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  /* Balance Section (Upper portion) */
  balanceSection: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  balanceNumber: {
    fontSize: 72,
    lineHeight: 76,
    fontWeight: '800',
    letterSpacing: -2,
  },
  balanceSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  /* Error Box */
  errorBox: {
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    textAlign: 'center',
  },

  /* Bottom Controls (Aligned to Bottom End) */
  bottomSection: {
    gap: 16,
    paddingTop: 24,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingBottom: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    minWidth: 130,
    textAlign: 'center',
  },

  /* Action Row */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  testButton: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  /* Rates Toggle & Clean List */
  ratesToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
  },
  ratesToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratesList: {
    paddingTop: 6,
    paddingBottom: 8,
  },
  rateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rateLineName: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  rateLineValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
});
