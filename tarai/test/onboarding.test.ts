import { describe, expect, it } from 'vitest';
import { compileWorkspaceSetup, onboardingCatalog, validateCanvasDocument } from '../src/genui/onboarding.ts';

describe('workspace onboarding compiler', () => {
  it('compiles confirmed bakery choices into an OKF profile and registered canvas', () => {
    const setup = compileWorkspaceSetup('Sweet Crumb Bakery', {
      category: 'bakery',
      activities: ['sales', 'orders', 'inventory', 'tasks'],
      priorities: ['orders.upcoming', 'inventory.low', 'tasks.urgent'],
      actions: ['sale.create', 'order.create', 'inventory.view_low'],
      audience: 'team',
      note: 'We make custom wedding cakes.',
    }, 'user_1', 1234);

    expect(setup.profileMarkdown).toContain('# Sweet Crumb Bakery');
    expect(setup.profileMarkdown).toContain('We make custom wedding cakes.');
    expect(setup.canvasMarkdown).toContain('action: sale.create');
    expect((setup.canvas.blocks as unknown[])).toHaveLength(3);
    expect((setup.canvas.chips as unknown[])).toHaveLength(3);
    expect(validateCanvasDocument(setup.canvas).valid).toBe(true);
  });

  it('falls back safely when onboarding input is malformed', () => {
    const setup = compileWorkspaceSetup('General Space', { category: 'unknown' }, 'user_1', 1234);
    expect(setup.onboarding.category).toBe('general');
    expect((setup.canvas.blocks as unknown[]).length).toBeGreaterThan(0);
  });

  it('creates a useful universal starter space without asking for a business type', () => {
    const setup = compileWorkspaceSetup('My Space', {
      category: 'general',
      activities: ['tasks', 'notes', 'customers'],
      priorities: ['tasks.urgent', 'contacts.recent'],
      actions: ['task.create', 'contact.create', 'pipeline.create'],
      audience: 'solo',
    }, 'user_1', 1234);

    expect(setup.onboarding.category).toBe('general');
    expect(setup.profileMarkdown).toContain('manage tasks');
    expect(setup.profileMarkdown).toContain('organize notes and documents');
    expect(setup.canvasMarkdown).toContain('action: task.create');
    expect(setup.canvasMarkdown).toContain('action: contact.create');
  });

  it('publishes a versioned autocomplete catalog', () => {
    const catalog = onboardingCatalog();
    expect(catalog.version).toBe(1);
    expect(catalog.categories.some((item) => item.id === 'bakery')).toBe(true);
    expect(catalog.actions.some((item) => item.id === 'site.open')).toBe(true);
  });

  it('rejects unknown actions and executable canvas content', () => {
    expect(validateCanvasDocument({ blocks: [], chips: [{ label: 'Unsafe', action: 'unknown.run' }] }).valid).toBe(false);
    expect(validateCanvasDocument({ blocks: [], chips: [], notice: 'SELECT * FROM members' }).valid).toBe(false);
  });
});
