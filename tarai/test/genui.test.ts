import { describe, it, expect } from 'vitest';
import { validateCanvas, createDefaultCanvas } from '../src/genui/canvas.ts';

describe('GenUI Canvas Parser & Constraint Enforcement', () => {
  it('validates default canvas structure', () => {
    const canvas = createDefaultCanvas('owner');
    const res = validateCanvas(canvas);
    expect(res.valid).toBe(true);
    expect(res.ast?.liveActionStream.length).toBeLessThanOrEqual(3);
  });

  it('strictly rejects liveActionStream with more than 3 cards', () => {
    const invalidCanvas = {
      version: '1.0.0',
      glanceBar: { mode: 'Overview', notice: 'Nominal' },
      liveActionStream: [
        { id: 'b1', type: 'task-inbox', title: 'Tasks', dataSource: 'tasks.list' },
        { id: 'b2', type: 'metric-card', title: 'Metrics', dataSource: 'metrics.get' },
        { id: 'b3', type: 'stock-sheet', title: 'Stock', dataSource: 'inventory.list' },
        { id: 'b4', type: 'quick-pos', title: 'POS', dataSource: 'pos.session' }, // 4th card!
      ],
      actionDock: { chips: ['New'], intentEnabled: true },
    };

    const res = validateCanvas(invalidCanvas);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Live action stream must contain at most 3 cards');
  });

  it('rejects canvas containing SQL statements', () => {
    const maliciousCanvas = {
      version: '1.0.0',
      glanceBar: { mode: 'Overview', notice: 'SELECT * FROM members' },
      liveActionStream: [
        { id: 'b1', type: 'task-inbox', title: 'Tasks', dataSource: 'tasks.list' },
      ],
      actionDock: { chips: ['New'], intentEnabled: true },
    };

    const res = validateCanvas(maliciousCanvas);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Security rejection: Canvas declaration cannot contain SQL');
  });

  it('rejects unregistered data views', () => {
    const invalidSourceCanvas = {
      version: '1.0.0',
      glanceBar: { mode: 'Overview', notice: 'Nominal' },
      liveActionStream: [
        { id: 'b1', type: 'task-inbox', title: 'Tasks', dataSource: 'unregistered.custom.query' },
      ],
      actionDock: { chips: ['New'], intentEnabled: true },
    };

    const res = validateCanvas(invalidSourceCanvas);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Invalid data source 'unregistered.custom.query'");
  });
});
