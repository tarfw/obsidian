import type { HarnessAction, HarnessInterfaceContract } from '@/lib/harness';
import { resolveActionInterface } from './registry';

interface Props {
  action: HarnessAction | null;
  inline?: boolean;
  contracts: HarnessInterfaceContract[];
  scope: string;
  initialInput?: Record<string, unknown>;
  contextTitle?: string;
  onClose: () => void;
  onSuccess: (result: Record<string, unknown>) => void;
}

export default function ActionInterfaceHost({ action, inline, contracts, scope, initialInput, contextTitle, onClose, onSuccess }: Props) {
  if (!action) return null;
  const resolved = resolveActionInterface(action, contracts);
  if (!resolved) return null;
  const { Component, contract } = resolved;
  return <Component visible inline={inline} scope={scope} action={action} contract={contract} initialInput={initialInput} contextTitle={contextTitle} onClose={onClose} onSuccess={onSuccess} />;
}
