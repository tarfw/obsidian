import { describe, expect, it } from 'vitest';
import { legacyWorkspaceTools } from '../../tarapp/src/lib/legacy-tools.ts';
import { canExecute } from '../src/access.ts';
import { actionCatalog, interfaceCatalog } from '../src/registry/catalog.ts';

const personal = { id: 'personal', name: 'Personal', slug: 'personal', scope: 'personal', role: 'owner', mode: 'personal', state: 'active' };

describe('older server Tools compatibility', () => {
  it('does not infer POS in Personal from the broad action registry', () => {
    const result = legacyWorkspaceTools(personal, actionCatalog, interfaceCatalog, { pos: false, site: false });
    expect(result.legacy).toBe(true);
    expect(result.tools.map((tool) => tool.id)).toContain('task');
    expect(result.tools.map((tool) => tool.id)).not.toContain('pos');
    expect(result.tools.map((tool) => tool.id)).not.toContain('site');
  });

  it('keeps cashier stock management out even when POS is configured', () => {
    const member = { workspaceId: 'work', userId: 'cashier', role: 'member', workRole: 'cashier', roles: ['cashier'], state: 'active' };
    const available = actionCatalog.filter((action) => canExecute(member, action.id));
    const workspace = { ...personal, id: 'work', name: 'Restaurant', slug: 'restaurant', scope: 'work', mode: 'work', role: 'member', workRole: 'cashier', roles: ['cashier'] };
    const result = legacyWorkspaceTools(workspace, available, interfaceCatalog, { pos: true, site: false });
    expect(result.tools.map((tool) => tool.id)).toContain('pos');
    expect(result.tools.map((tool) => tool.id)).toContain('register');
    expect(result.tools.map((tool) => tool.id)).not.toContain('stock');
  });
});
