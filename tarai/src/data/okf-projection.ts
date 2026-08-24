/**
 * OKF (Obsidian Knowledge Format) Projection Engine
 * Projects canonical Turso truth into versioned markdown files stored in R2.
 */
import type { Member, MotionEvent, NativeBlockConfig } from '../domain/types.ts';

export function projectTeamMarkdown(members: Member[]): string {
  const lines: string[] = [
    '# Workspace Team Roster',
    '',
    `*Generated at: ${new Date().toISOString()}*`,
    '',
    '| Email | Role | Status | User ID |',
    '|---|---|---|---|',
  ];

  for (const m of members) {
    lines.push(`| ${m.email} | ${m.role} | ${m.status} | ${m.userId} |`);
  }

  return lines.join('\n') + '\n';
}

export function projectCanvasMarkdown(
  mode: string,
  notice: string,
  cards: NativeBlockConfig[]
): string {
  const lines: string[] = [
    '# Workspace Canvas',
    '',
    `**Glance Mode:** ${mode}`,
    `**Notice:** ${notice}`,
    '',
    '## Live Action Stream (Max 3 Cards)',
    '',
  ];

  for (const card of cards) {
    lines.push(`### Block: ${card.title} (\`${card.type}\`)`);
    lines.push(`- **ID:** ${card.id}`);
    lines.push(`- **Data Source:** ${card.dataSource}`);
    if (card.roleVisibility) {
      lines.push(`- **Visibility:** ${card.roleVisibility.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function projectLogMarkdown(events: MotionEvent[]): string {
  const lines: string[] = [
    '# Workspace Motion Log',
    '',
    '| Timestamp | Event Type | Actor | Matter ID | Payload |',
    '|---|---|---|---|---|',
  ];

  for (const e of events) {
    const payloadStr = JSON.stringify(e.payload).replace(/\|/g, '\\|');
    lines.push(
      `| ${e.createdAt} | ${e.eventType} | ${e.actorId} | ${e.matterId || '-'} | \`${payloadStr}\` |`
    );
  }

  return lines.join('\n') + '\n';
}
