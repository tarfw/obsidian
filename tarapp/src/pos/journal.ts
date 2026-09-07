import { File, Paths } from 'expo-file-system';
import { getCurrentUser } from '@/lib/auth';

export interface PendingPosAction { action: string; input: Record<string, unknown>; key: string }
export async function posJournal(scope: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sign in before using POS.');
  const file = new File(Paths.document, 'pos-pending-' + encodeURIComponent(user.id + '-' + scope) + '.json');
  return {
    read(): PendingPosAction | null {
      if (!file.exists) return null;
      const value = JSON.parse(file.textSync()) as PendingPosAction | null;
      if (value && (!value.action?.startsWith('pos.') || !value.key || !value.input)) throw new Error('Payment recovery data needs attention.');
      return value;
    },
    write(value: PendingPosAction | null) {
      if (!file.exists) file.create();
      file.write(JSON.stringify(value));
    },
  };
}
