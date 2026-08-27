import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/db/provider';
import { getLocalInbox, markInboxDone, dismissInboxItem, decideInboxApproval, type InboxItem, type InboxContractKind } from '@/lib/inbox';
import { INBOX_STATUS } from '@/constants/types-config';

export interface UseInboxOptions {
  workspaceId?: string | null;
  contract?: InboxContractKind;
  status?: number;
  limit?: number;
}

export function useInbox(options: UseInboxOptions = {}) {
  const db = useDb();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getLocalInbox({
        workspaceId: options.workspaceId,
        contract: options.contract,
        status: options.status ?? INBOX_STATUS.pending,
        limit: options.limit || 100,
      });
      setItems(rows);
    } catch (err) {
      console.warn('[useInbox] Refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, [options.workspaceId, options.contract, options.status, options.limit, db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completeItem = useCallback(async (id: string, scope?: string) => {
    // Optimistic state update
    setItems((prev) => prev.filter((item) => item.id !== id));
    await markInboxDone(id, scope);
  }, []);

  const dismissItem = useCallback(async (id: string, scope?: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await dismissInboxItem(id, scope);
  }, []);

  const decideApproval = useCallback(async (id: string, decision: 'approved' | 'rejected', scope: string, reason?: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await decideInboxApproval(id, decision, scope, reason);
  }, []);

  // Split into 3 contract streams for convenient UI access
  const digests = items.filter((i) => i.contract === 'digest');
  const approvals = items.filter((i) => i.contract === 'approval');
  const signals = items.filter((i) => i.contract === 'signal');

  return {
    items,
    digests,
    approvals,
    signals,
    loading,
    refresh,
    completeItem,
    dismissItem,
    decideApproval,
  };
}
