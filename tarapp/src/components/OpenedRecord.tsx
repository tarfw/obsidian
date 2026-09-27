import { StyleSheet, Text, View } from 'react-native';
import type { HarnessRecord } from '@/lib/harness';

const labels: Record<string, string> = { description: 'Description', note: 'Note', location: 'Pickup', destination: 'Destination', reason: 'Reason', step: 'Step', flow: 'Flow' };
const ignored = new Set(['projectionRole', 'actions', 'input']);

function display(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => {
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (item && typeof item === 'object') {
      const entry = item as Record<string, unknown>;
      return [entry.quantity ? `${entry.quantity}×` : null, entry.title || entry.name || entry.product, entry.status].filter(Boolean).join(' ');
    }
    return '';
  }).filter(Boolean).join('\n') || null;
  return null;
}

export default function OpenedRecord({ record }: { record: HarnessRecord }) {
  return <View style={styles.section}>
    <Text style={styles.heading}>Source facts</Text>
    <Text style={styles.fact}>Type: {record.type}</Text>
    <Text style={styles.fact}>State: {record.state}</Text>
    <Text style={styles.fact}>Version: {record.version}</Text>
    {Object.entries(record.data).filter(([key]) => !ignored.has(key)).map(([key, value]) => {
      const shown = display(value);
      return shown ? <Text key={key} style={styles.fact}>{labels[key] || key}: {shown}</Text> : null;
    })}
  </View>;
}

const styles = StyleSheet.create({ section: { gap: 10, paddingVertical: 22, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D8DBE3' }, heading: { fontSize: 15, fontWeight: '800', color: '#1B1C20' }, fact: { fontSize: 14, lineHeight: 21, color: '#626671' } });
