import type { HarnessAction, HarnessInterfaceContract } from '@/lib/harness';

export interface ActionInterfaceProps {
  visible: boolean;
  scope: string;
  action: HarnessAction;
  contract: HarnessInterfaceContract;
  initialInput?: Record<string, unknown>;
  contextTitle?: string;
  onClose: () => void;
  onSuccess: (result: Record<string, unknown>) => void;
}
