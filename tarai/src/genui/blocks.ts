/**
 * GenUI Native Block Definitions
 */
import * as v from 'valibot';
import type { NativeBlockType } from '../domain/types.ts';

export const VALID_BLOCK_TYPES: NativeBlockType[] = [
  'task-inbox',
  'metric-card',
  'quick-pos',
  'stock-sheet',
  'pipeline-card',
  'contact-card',
  'action-confirm',
  'data-grid',
];

export const NativeBlockSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  type: v.picklist(VALID_BLOCK_TYPES),
  title: v.pipe(v.string(), v.minLength(1)),
  dataSource: v.pipe(v.string(), v.minLength(1)),
  filters: v.optional(v.record(v.string(), v.unknown())),
  roleVisibility: v.optional(v.array(v.picklist(['owner', 'admin', 'member', 'guest']))),
});
