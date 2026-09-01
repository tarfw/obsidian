import { TaraiRequestError, tar, type BotBuilderDraft, type PersonalTodayCard } from '@/lib/tar';
import { pendingPersonalSteps, queuePersonalStep, removePendingPersonalStep } from '@/lib/personal-pending';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Props { onOpenSwitcher: () => void; }
type PlanKind = 'plan' | 'routine' | 'task';

export default function PersonalTodayCanvas({ onOpenSwitcher }: Props) {
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<PersonalTodayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<PersonalTodayCard | null>(null);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState<PlanKind>('plan');
  const [planning, setPlanning] = useState(false);

  const reload = useCallback(async () => {
    setError('');
    try {
      for (const pending of await pendingPersonalSteps()) {
        await tar.personal.completeStep(pending.runId, pending.id);
        await removePendingPersonalStep(pending.id);
      }
      setCards((await tar.personal.today()).cards);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load Today.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const createSuggestion = async () => {
    const request = prompt.trim();
    if (!request) return;
    setPlanning(true);
    try {
      if (kind === 'task') {
        await tar.personal.addTask(request);
        setPlannerOpen(false); setPrompt(''); await reload();
        return;
      }
      const draft: BotBuilderDraft = await tar.botBuilder.generate('p', request, { personal: 'true', kind }, []);
      await tar.personal.suggestPlan(draft, kind);
      setPlannerOpen(false); setPrompt(''); await reload();
    } catch (cause) { Alert.alert('Could not plan', cause instanceof Error ? cause.message : 'Try again.'); }
    finally { setPlanning(false); }
  };

  const decide = async (card: PersonalTodayCard, accept: boolean) => {
    if (!card.updateId) return;
    try {
      if (accept) await tar.personal.acceptPlan(card.updateId); else await tar.personal.rejectPlan(card.updateId);
      await reload();
    } catch (cause) { Alert.alert('Could not update plan', cause instanceof Error ? cause.message : 'Try again.'); }
  };

  const complete = async () => {
    if (!activeCard?.runId) return;
    try { await tar.personal.completeStep(activeCard.runId); setActiveCard(null); await reload(); }
    catch (cause) {
      if (cause instanceof TaraiRequestError && cause.status < 500) {
        Alert.alert('Could not complete step', cause.message);
        return;
      }
      await queuePersonalStep(activeCard.runId);
      setCards((current) => current.filter((card) => card.id !== activeCard.id));
      setActiveCard(null);
    }
  };

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onOpenSwitcher} style={styles.meButton}>
            <Text style={styles.me}>Me</Text><Ionicons name="chevron-down" size={16} color="#5f6368" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPlannerOpen(true)} hitSlop={10}><Text style={styles.add}>Plan</Text></TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 48 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {error ? <Pressable onPress={() => void reload()} style={styles.notice}><Text style={styles.noticeText}>{error} Tap to retry.</Text></Pressable> : null}
        <Text style={styles.heading}>Today</Text>
        <Text style={styles.subheading}>Your private plan and routines.</Text>
        {loading ? <View style={styles.loading}><ActivityIndicator color="#1a73e8" /></View> : null}
        {!loading && !cards.length ? <TouchableOpacity onPress={() => setPlannerOpen(true)} style={styles.emptyAction}><Text style={styles.emptyTitle}>Plan my day</Text><Text style={styles.emptyDetail}>Create a private plan or routine.</Text></TouchableOpacity> : null}
        {!loading && cards.map((card) => card.kind === 'plan-update' ? (
          <View key={card.id} style={styles.card}>
            <Text style={styles.cardTitle}>{card.title}</Text><Text style={styles.cardDetail}>{card.detail}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => void decide(card, false)}><Text style={styles.reject}>Not now</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => void decide(card, true)}><Text style={styles.accept}>Use plan</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity key={card.id} style={styles.card} onPress={() => setActiveCard(card)}>
            <Text style={styles.cardTitle}>{card.title}</Text><Text style={styles.cardDetail}>{card.detail || 'Open step'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={plannerOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPlannerOpen(false)}>
        <View style={[styles.modalPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={() => setPlannerOpen(false)}><Ionicons name="arrow-back" size={23} color="#202124" /></TouchableOpacity><Text style={styles.modalTitle}>Plan</Text><View style={styles.headerSpacer} /></View>
          <View style={styles.plannerContent}>
            <Text style={styles.plannerHeading}>What would you like to plan?</Text>
            <View style={styles.kindRow}>
              {(['task', 'plan', 'routine'] as PlanKind[]).map((item) => <TouchableOpacity key={item} onPress={() => setKind(item)} style={[styles.kind, kind === item && styles.kindSelected]}><Text style={[styles.kindText, kind === item && styles.kindTextSelected]}>{item[0].toUpperCase() + item.slice(1)}</Text></TouchableOpacity>)}
            </View>
            <TextInput autoFocus multiline value={prompt} onChangeText={setPrompt} placeholder={kind === 'task' ? 'Add a private task' : kind === 'routine' ? 'Describe a routine' : 'Describe your plan'} style={styles.input} textAlignVertical="top" />
            <TouchableOpacity disabled={!prompt.trim() || planning} onPress={() => void createSuggestion()} style={[styles.primary, (!prompt.trim() || planning) && styles.primaryDisabled]}><Text style={styles.primaryText}>{planning ? 'Planning…' : kind === 'task' ? 'Add task' : 'Create suggestion'}</Text></TouchableOpacity>
            {kind !== 'task' && <Text style={styles.note}>Nothing is added until you choose Use plan.</Text>}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(activeCard)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setActiveCard(null)}>
        <View style={[styles.modalPage, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={() => setActiveCard(null)}><Ionicons name="arrow-back" size={23} color="#202124" /></TouchableOpacity><Text style={styles.modalTitle}>Step</Text><View style={styles.headerSpacer} /></View>
          <View style={styles.stepContent}><Text style={styles.stepTitle}>{activeCard?.title}</Text><Text style={styles.stepDetail}>{activeCard?.detail}</Text><TouchableOpacity onPress={() => void complete()} style={styles.primary}><Text style={styles.primaryText}>Complete</Text></TouchableOpacity></View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' }, header: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e8eaed' }, topRow: { height: 56, paddingHorizontal: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, meButton: { flexDirection: 'row', gap: 6, alignItems: 'center' }, me: { color: '#202124', fontWeight: '800', fontSize: 20 }, add: { color: '#1a73e8', fontWeight: '700', fontSize: 15 }, content: { padding: 28 }, heading: { marginTop: 20, color: '#202124', fontSize: 34, lineHeight: 40, fontWeight: '700' }, subheading: { color: '#6b7078', fontSize: 17, lineHeight: 25, marginTop: 8, marginBottom: 24 }, loading: { minHeight: 120, alignItems: 'center', justifyContent: 'center' }, notice: { backgroundColor: '#fce8e6', padding: 12, borderRadius: 8 }, noticeText: { color: '#a50e0e' }, emptyAction: { borderWidth: 1, borderColor: '#e8eaed', borderRadius: 10, padding: 18 }, emptyTitle: { color: '#202124', fontSize: 17, fontWeight: '700' }, emptyDetail: { color: '#5f6368', fontSize: 14, marginTop: 5 }, card: { borderWidth: 1, borderColor: '#e8eaed', borderRadius: 10, padding: 16, marginBottom: 10 }, cardTitle: { color: '#202124', fontSize: 17, fontWeight: '700' }, cardDetail: { color: '#5f6368', fontSize: 14, marginTop: 5 }, cardActions: { flexDirection: 'row', gap: 24, marginTop: 16 }, reject: { color: '#5f6368', fontSize: 15, fontWeight: '700' }, accept: { color: '#1a73e8', fontSize: 15, fontWeight: '700' }, modalPage: { flex: 1, backgroundColor: '#fff' }, modalHeader: { height: 58, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e8eaed' }, modalTitle: { color: '#202124', fontSize: 17, fontWeight: '700' }, headerSpacer: { width: 23 }, plannerContent: { padding: 28 }, plannerHeading: { color: '#202124', fontSize: 25, lineHeight: 31, fontWeight: '700' }, kindRow: { flexDirection: 'row', gap: 10, marginTop: 24 }, kind: { borderWidth: 1, borderColor: '#dadce0', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8 }, kindSelected: { borderColor: '#1a73e8', backgroundColor: '#e8f0fe' }, kindText: { color: '#5f6368', fontSize: 14, fontWeight: '700' }, kindTextSelected: { color: '#1a73e8' }, input: { minHeight: 130, marginTop: 20, borderWidth: 1, borderColor: '#dadce0', borderRadius: 10, padding: 14, color: '#202124', fontSize: 16 }, primary: { alignSelf: 'flex-start', marginTop: 20, backgroundColor: '#1a73e8', borderRadius: 6, paddingHorizontal: 18, paddingVertical: 13 }, primaryDisabled: { opacity: 0.5 }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' }, note: { color: '#70757a', fontSize: 13, marginTop: 14 }, stepContent: { padding: 28 }, stepTitle: { color: '#202124', fontSize: 30, lineHeight: 38, fontWeight: '700' }, stepDetail: { color: '#5f6368', fontSize: 17, lineHeight: 25, marginTop: 10 },
});
