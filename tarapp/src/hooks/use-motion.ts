import { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/db/provider';
import { MOTION_TYPE_NAMES, toMotionTypeCode } from '@/constants/types-config';
import { tar } from '@/lib/tar';

export interface MotionRow {
  id: string;
  type: number;
  typeName?: string;
  actor: string;
  ref?: string | null;
  data: Record<string, any>;
  idem?: string;
  created: number;
  created_at: string;
}

export interface ActionItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  urgency: 'Now' | 'Next' | 'Later' | 'Done';
  time: string;
  status: 'todo' | 'in_progress' | 'done';
  route: string;
  routeParams: Record<string, string>;
  data?: Record<string, any>;
}

export interface ActionGroup {
  id: string;
  name: string;
  type: string;
  color: string;
  actions: ActionItem[];
}

function parseData(data: unknown): Record<string, any> {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return {}; }
  }
  if (typeof data === 'object' && data !== null) return data as Record<string, any>;
  return {};
}

function getActionLabel(type: number): string {
  return MOTION_TYPE_NAMES[type] ? MOTION_TYPE_NAMES[type].replace(/_/g, ' ') : 'Activity';
}

function getUrgency(type: number, data: Record<string, any>): 'Now' | 'Next' | 'Later' | 'Done' {
  const doneSet = new Set([102, 111, 113, 115, 119, 121, 122, 126, 128, 130]);
  if (doneSet.has(type)) return 'Done';
  if (type === 131 || type === 129) return 'Now'; // Low stock, approval requested
  if (type === 124 || type === 125) return 'Next'; // Order placed / ready
  return data.urgency || 'Now';
}

function getStatus(type: number): 'todo' | 'in_progress' | 'done' {
  const doneSet = new Set([102, 111, 113, 115, 119, 121, 122, 126, 128, 130]);
  if (doneSet.has(type)) return 'done';
  if (type === 118 || type === 120 || type === 125) return 'in_progress';
  return 'todo';
}

export function useMotion(urgency?: string, scope?: string) {
  const db = useDb();
  const [groups, setGroups] = useState<ActionGroup[]>([]);
  const [motions, setMotions] = useState<MotionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM motion WHERE deleted_at IS NULL ORDER BY created DESC LIMIT 200'
      ).catch(() => []);

      const parsedMotions: MotionRow[] = rows.map((r: any) => {
        const d = parseData(r.data);
        const typeCode = typeof r.type === 'number' ? r.type : toMotionTypeCode(r.type);
        const createdMs = typeof r.created === 'number' ? r.created : Date.now();
        return {
          id: String(r.id || ''),
          type: typeCode,
          typeName: MOTION_TYPE_NAMES[typeCode] || String(typeCode),
          actor: String(r.actor || ''),
          ref: r.ref || null,
          data: d,
          idem: r.idem,
          created: createdMs,
          created_at: new Date(createdMs).toISOString(),
        };
      });

      setMotions(parsedMotions);

      // Group motions by reference / entity
      const groupMap = new Map<string, ActionGroup>();

      for (const m of parsedMotions) {
        const groupId = m.ref || m.actor || 'general';
        const label = getActionLabel(m.type);
        const urgencyVal = getUrgency(m.type, m.data);
        const statusVal = getStatus(m.type);
        const title = m.data.title || m.data.subject || m.data.text || `${label.charAt(0).toUpperCase() + label.slice(1)}`;
        const subtitle = m.data.customer_name || m.data.staff_name || m.data.sku || (m.ref ? `Ref: ${m.ref}` : undefined);

        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            id: groupId,
            name: title,
            type: m.typeName || 'motion',
            color: '#5E6AD2',
            actions: [],
          });
        }

        const group = groupMap.get(groupId)!;
        group.actions.push({
          id: m.id,
          title,
          subtitle,
          category: m.typeName || 'motion',
          urgency: urgencyVal,
          time: m.created_at,
          status: statusVal,
          route: '/entity',
          routeParams: { id: m.ref || m.id },
          data: m.data,
        });
      }

      let result = Array.from(groupMap.values());

      if (urgency) {
        result = result
          .map(g => ({ ...g, actions: g.actions.filter(a => a.urgency === urgency) }))
          .filter(g => g.actions.length > 0);
      }

      setGroups(result);
    } catch (e) {
      console.warn('[useMotion] error:', e);
      setGroups([]);
      setMotions([]);
    } finally {
      setLoading(false);
    }
  }, [db, urgency]);

  useEffect(() => { refresh(); }, [refresh]);

  const emit = useCallback(async (type: number | string, data: Record<string, any>, ref?: string) => {
    try {
      const typeStr = typeof type === 'number' ? (MOTION_TYPE_NAMES[type] || 'activity_recorded') : type;
      await tar.writeEvent(scope || 'p', typeStr, { ...data, ref });
      await refresh();
    } catch (e) {
      console.warn('[useMotion] emit error:', e);
    }
  }, [refresh, scope]);

  return { groups, motions, loading, refresh, emit };
}

