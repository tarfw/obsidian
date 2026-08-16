/**
 * OKF Skill-Driven Intent Resolution for Channels (plan6.md §15)
 * Dynamically resolves natural language messages against workspace OKF skills.
 */

import { listWorkspaceModules, readWithFallback } from '../lib/okf';
import { parseSkillMarkdown, ParsedSkill, ParsedAction } from '../lib/skill-parser';
import { executeSkillAction } from '../lib/action-executor';
import { getOrCreateWorkspaceDb } from '../lib/workspace-db';
import { dbContext } from '../lib/db';
import { extractSlots, SlotDefinition } from '../lib/slots';

export interface ChannelIntentResult {
  handled: boolean;
  replyText: string;
  actionExecuted?: string;
  error?: string;
}

/**
 * Load all active skills for a workspace scope.
 */
export async function loadWorkspaceSkills(env: any, scope: string): Promise<ParsedSkill[]> {
  const modules = await listWorkspaceModules(env, scope);
  const skills: ParsedSkill[] = [];

  for (const mod of modules) {
    try {
      const content = await readWithFallback(env, scope, `skills/${mod}.md`);
      if (content) {
        const parsed = parseSkillMarkdown(content);
        skills.push(parsed);
      }
    } catch (e) {
      console.warn(`[channel-intent] Failed to load skill ${mod}:`, e);
    }
  }

  return skills;
}

/**
 * Match a natural language message to an action across all active workspace skills.
 */
export async function resolveAndExecuteChannelIntent(
  env: any,
  scope: string,
  userHandle: string,
  userRole: string,
  text: string
): Promise<ChannelIntentResult> {
  const cleanText = text.trim();
  if (!cleanText) {
    return { handled: false, replyText: '' };
  }

  const skills = await loadWorkspaceSkills(env, scope);
  if (skills.length === 0) {
    return { handled: false, replyText: '' };
  }

  // 1. Check all actions in active skills
  let matchedAction: ParsedAction | null = null;
  const lowerText = cleanText.toLowerCase();

  for (const skill of skills) {
    for (const action of skill.actions) {
      const intents = action.intents || [];
      const hasIntentMatch = intents.some(pattern => {
        const p = pattern.toLowerCase();
        if (lowerText.includes(p) || p.includes(lowerText)) return true;
        try {
          const re = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
          return re.test(cleanText);
        } catch {
          return false;
        }
      });

      const actionNameNormalized = action.name.replace(/_/g, ' ').toLowerCase();
      const directMatch = lowerText.includes(actionNameNormalized) ||
                          (action.purpose && lowerText.includes(action.purpose.toLowerCase()));

      if (hasIntentMatch || directMatch) {
        matchedAction = action;
        break;
      }
    }
    if (matchedAction) break;
  }

  if (!matchedAction) {
    return { handled: false, replyText: '' };
  }

  // 2. Extract parameters / slots from text
  const slotDefs: SlotDefinition[] = (matchedAction.params || []).map(p => ({
    key: p.name,
    label: p.name,
    type: p.type || 'text',
  }));

  const slotParams = extractSlots(cleanText, slotDefs);
  const initialContext: Record<string, any> = {
    ...slotParams,
    userHandle,
    by: userHandle,
    role: userRole,
    scope,
    text: cleanText,
  };

  // Extract common numbers, amounts, and references
  const dollarMatch = cleanText.match(/\$?(\d+(\.\d+)?)/);
  if (dollarMatch && !initialContext['amount'] && !initialContext['total'] && !initialContext['price']) {
    initialContext['amount'] = parseFloat(dollarMatch[1]);
    initialContext['total'] = parseFloat(dollarMatch[1]);
    initialContext['price'] = parseFloat(dollarMatch[1]);
  }

  const tableMatch = cleanText.match(/table\s*(\d+)/i);
  if (tableMatch && !initialContext['table']) {
    initialContext['table'] = tableMatch[1];
    initialContext['table_id'] = `tbl_${tableMatch[1]}`;
  }

  // 3. Execute Action via executeSkillAction within Workspace Turso Context
  try {
    let result: any;
    if (env.TURSO_PLATFORM_TOKEN) {
      const subdomain = scope.replace(/^w:/, '');
      const creds = await getOrCreateWorkspaceDb(env.DB, subdomain, scope, env.TURSO_PLATFORM_TOKEN);
      result = await dbContext.run({ url: creds.url, token: creds.authToken }, async () => {
        return executeSkillAction(env, matchedAction!.name, initialContext, scope);
      });
    } else {
      result = await executeSkillAction(env, matchedAction.name, initialContext, scope);
    }

    if (result && result.success) {
      const actionTitle = matchedAction.name.replace(/_/g, ' ');
      return {
        handled: true,
        actionExecuted: matchedAction.name,
        replyText: `✅ <b>${actionTitle}</b> executed successfully for <b>${userHandle}</b>.\nSteps: ${result.stepsExecuted}`,
      };
    } else {
      return {
        handled: true,
        actionExecuted: matchedAction.name,
        replyText: `⚠️ Action <b>${matchedAction.name}</b> encountered an issue: ${result?.error || 'Execution incomplete'}`,
      };
    }
  } catch (execErr: any) {
    return {
      handled: true,
      error: execErr.message,
      replyText: `⚠️ Failed to execute <b>${matchedAction.name}</b>: ${execErr.message}`,
    };
  }
}
