import { parseDesignTokens, DesignTokens } from './design-tokens';

export interface UISection {
  type: 'quick-actions' | 'metric-card' | 'data-table' | 'timeline-feed' | 'booking-grid' | 'catalog-grid' | 'report-chart' | 'status-board' | 'entity-navigator' | 'entity-directory' | 'plan5-directory' | 'explore-feed' | 'inbox-feed';
  title?: string;
  actions?: string[];
  data?: string;
  dataSource?: string;
  columns?: string[];
  entities?: string[];
}

export interface WorkspaceAction {
  name: string;
  module: string;
  purpose: string;
  intents: string[];
  params: Array<{ name: string; type: 'text' | 'number' | 'select'; required: boolean }>;
  icon?: string;
}

export interface WorkspaceModuleLayout {
  moduleName: string;
  layout: string; // e.g. dashboard
  primaryAction?: string;
  sections: UISection[];
  actions: Record<string, WorkspaceAction>;
}

/**
 * Super lightweight YAML frontmatter parser for React Native client.
 */
export function parseYamlFrontmatter(mdContent: string): { frontmatter: any; markdownBody: string } {
  const parts = mdContent.split('---');
  if (parts.length < 3) {
    return { frontmatter: {}, markdownBody: mdContent };
  }
  
  const yamlText = parts[1];
  const markdownBody = parts.slice(2).join('---');
  
  const obj: any = {};
  const lines = yamlText.split('\n');
  
  let currentKey = '';
  let inList = false;
  let listKey = '';
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Check for inline arrays: key: [item1, item2]
    const inlineArrayMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*\[(.*)\]/);
    if (inlineArrayMatch) {
      const [_, key, itemsStr] = inlineArrayMatch;
      obj[key] = itemsStr.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      continue;
    }

    // Check for list items: - item
    if (trimmed.startsWith('-')) {
      const val = trimmed.slice(1).trim().replace(/^['"]|['"]$/g, '');
      if (inList && listKey) {
        if (!obj[listKey]) obj[listKey] = [];
        obj[listKey].push(val);
      }
      continue;
    }

    // Check for standard key-value: key: value
    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)/);
    if (kvMatch) {
      const [_, key, valStr] = kvMatch;
      const cleanVal = valStr.trim().replace(/^['"]|['"]$/g, '');
      
      if (cleanVal === '') {
        // Start of a nested block or list
        currentKey = key;
        inList = true;
        listKey = key;
        obj[key] = [];
      } else {
        inList = false;
        if (cleanVal === 'true') obj[key] = true;
        else if (cleanVal === 'false') obj[key] = false;
        else if (!isNaN(Number(cleanVal)) && cleanVal !== '') obj[key] = Number(cleanVal);
        else obj[key] = cleanVal;
      }
    }
  }

  // Fallbacks for nested objects like app_layout.sections
  const parsedSections: UISection[] = [];
  let currentSection: any = null;
  
  // Custom manual parser for sections block in YAML
  let sectionLines = yamlText.split('\n');
  let inSections = false;
  
  for (let line of sectionLines) {
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    
    if (trimmed.startsWith('sections:')) {
      inSections = true;
      continue;
    }
    
    if (inSections) {
      if (indent === 0 && trimmed !== '') {
        inSections = false;
        continue;
      }
      
      if (trimmed.startsWith('- type:')) {
        if (currentSection) parsedSections.push(currentSection);
        const type = trimmed.replace('- type:', '').trim().replace(/^['"]|['"]$/g, '');
        currentSection = { type };
      } else if (trimmed.startsWith('title:') && currentSection) {
        currentSection.title = trimmed.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
      } else if (trimmed.startsWith('data:') && currentSection) {
        currentSection.data = trimmed.replace('data:', '').trim().replace(/^['"]|['"]$/g, '');
      } else if (trimmed.startsWith('actions:') && currentSection) {
        // e.g. actions: [record_sale, void_order]
        const actMatch = trimmed.match(/actions\s*:\s*\[(.*)\]/);
        if (actMatch) {
          currentSection.actions = actMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        }
      } else if (trimmed.startsWith('entities:') && currentSection) {
        // e.g. entities: [pipeline, contacts]
        const entMatch = trimmed.match(/entities\s*:\s*\[(.*)\]/);
        if (entMatch) {
          currentSection.entities = entMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        }
      }
    }
  }
  if (currentSection) parsedSections.push(currentSection);
  
  if (parsedSections.length > 0) {
    if (!obj.app_layout) obj.app_layout = {};
    obj.app_layout.sections = parsedSections;
  }

  // Custom manual parser for actions block in YAML
  const parsedActions: any[] = [];
  let currentAction: any = null;
  let inActions = false;
  let actionLines = yamlText.split('\n');

  for (let line of actionLines) {
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    if (trimmed.startsWith('actions:')) {
      inActions = true;
      continue;
    }

    if (inActions) {
      if (indent === 0 && trimmed !== '') {
        inActions = false;
        continue;
      }

      if (trimmed.startsWith('- name:')) {
        if (currentAction) parsedActions.push(currentAction);
        const name = trimmed.replace('- name:', '').trim().replace(/^['"]|['"]$/g, '');
        currentAction = { name, params: [] };
      } else if (trimmed.startsWith('icon:') && currentAction) {
        currentAction.icon = trimmed.replace('icon:', '').trim().replace(/^['"]|['"]$/g, '');
      } else if (trimmed.startsWith('params:') && currentAction) {
        const paramsMatch = trimmed.match(/params\s*:\s*\[(.*)\]/);
        if (paramsMatch) {
          currentAction.params = paramsMatch[1]
            .split(',')
            .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean)
            .map(pName => ({ name: pName, type: 'text', required: true }));
        }
      }
    }
  }
  if (currentAction) parsedActions.push(currentAction);

  if (parsedActions.length > 0) {
    obj.actions = parsedActions;
  }
  
  return { frontmatter: obj, markdownBody };
}

export function buildModuleLayout(moduleName: string, mdContent: string): WorkspaceModuleLayout {
  const { frontmatter } = parseYamlFrontmatter(mdContent);
  
  const app_layout = frontmatter.app_layout || {};
  const sections: UISection[] = app_layout.sections || [];
  const primaryAction = app_layout.primary_action || '';
  const layout = app_layout.layout || 'dashboard';

  const actions: Record<string, WorkspaceAction> = {};
  if (frontmatter.actions && Array.isArray(frontmatter.actions)) {
    frontmatter.actions.forEach((act: any) => {
      if (act && act.name) {
        actions[act.name] = {
          name: act.name,
          module: moduleName,
          purpose: act.purpose || `Execute ${act.name}`,
          intents: act.intents || [act.name.replace(/_/g, ' ')],
          params: act.params || [],
          icon: act.icon || 'play-outline',
        };
      }
    });
  }

  return {
    moduleName,
    layout,
    primaryAction,
    sections,
    actions,
  };
}

export interface CanvasBlock {
  id?: string;
  title: string;
  type: string;
  roles?: string[];
  props: Record<string, any>;
}

export interface CanvasChip {
  label: string;
  action?: string;
  target?: string;
  intent?: string;
}

export interface CanvasLifeMode {
  id: string;
  label: string;
  icon?: string;
  schedule?: string; // e.g. "08:00-17:00"
  chips?: CanvasChip[];
  blocks: CanvasBlock[];
}

export interface CanvasDocument {
  title: string;
  type?: string;
  chips?: CanvasChip[];
  actions?: CanvasChip[];
  lifeModes: CanvasLifeMode[];
  blocks: CanvasBlock[];
  activeModeId?: string;
}

export function parseCanvasMarkdown(content: string): CanvasDocument {
  const parts = content.split('---');
  if (parts.length < 3) {
    return { title: 'Workspace Canvas', lifeModes: [], blocks: [] };
  }
  
  const yamlText = parts[1];
  const blocks: CanvasBlock[] = [];
  const lifeModes: CanvasLifeMode[] = [];
  let title = 'Workspace Canvas';

  // Read title
  const titleMatch = yamlText.match(/title:\s*["']?([^"\n\r']+)["']?/);
  if (titleMatch) {
    title = titleMatch[1];
  }

  const lines = yamlText.split('\n');
  let inLifeModes = false;
  let inBlocks = false;
  let inChips = false;
  let inActions = false;
  let currentMode: CanvasLifeMode | null = null;
  let currentBlock: any = null;
  let inBlockProps = false;
  let inBlockRoles = false;
  let rootChips: CanvasChip[] = [];
  let rootActions: CanvasChip[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for root keys
    if (rawLine.search(/\S/) === 0) {
      if (trimmed.startsWith('chips:')) {
        inChips = true;
        inLifeModes = false;
        inBlocks = false;
        inActions = false;
        const inlineChipsMatch = trimmed.match(/chips\s*:\s*\[(.*)\]/);
        if (inlineChipsMatch) {
          rootChips = inlineChipsMatch[1]
            .split(',')
            .map((c) => ({ label: c.trim().replace(/^['"]|['"]$/g, '') }))
            .filter((c) => c.label.length > 0);
          inChips = false;
        }
        continue;
      }
      if (trimmed.startsWith('actions:')) {
        inActions = true;
        inChips = false;
        inLifeModes = false;
        inBlocks = false;
        continue;
      }
      if (trimmed.startsWith('life_modes:')) {
        inLifeModes = true;
        inBlocks = false;
        inChips = false;
        inActions = false;
        continue;
      }
      if (trimmed.startsWith('blocks:')) {
        inBlocks = true;
        inLifeModes = false;
        inChips = false;
        inActions = false;
        continue;
      }
      if (!trimmed.startsWith('-')) {
        inLifeModes = false;
        inBlocks = false;
        inChips = false;
        inActions = false;
      }
    }

    // Parse Root Chips List
    if (inChips) {
      if (trimmed.startsWith('-')) {
        const cleanTrimmed = trimmed.replace(/^-\s*/, '');
        if (cleanTrimmed.startsWith('label:')) {
          const label = cleanTrimmed.replace('label:', '').trim().replace(/^['"]|['"]$/g, '');
          rootChips.push({ label });
        } else if (cleanTrimmed.startsWith('target:')) {
          if (rootChips.length > 0) {
            rootChips[rootChips.length - 1].target = cleanTrimmed.replace('target:', '').trim().replace(/^['"]|['"]$/g, '');
          }
        } else if (cleanTrimmed.startsWith('action:') && rootChips.length > 0) {
          rootChips[rootChips.length - 1].action = cleanTrimmed.replace('action:', '').trim().replace(/^['"]|['"]$/g, '');
        } else {
          rootChips.push({ label: cleanTrimmed.replace(/^['"]|['"]$/g, '') });
        }
      } else if (trimmed.startsWith('target:') && rootChips.length > 0) {
        rootChips[rootChips.length - 1].target = trimmed.replace('target:', '').trim().replace(/^['"]|['"]$/g, '');
      } else if (trimmed.startsWith('action:') && rootChips.length > 0) {
        rootChips[rootChips.length - 1].action = trimmed.replace('action:', '').trim().replace(/^['"]|['"]$/g, '');
      }
    }

    if (inActions) {
      if (trimmed.startsWith('-')) {
        const clean = trimmed.replace(/^-\s*/, '');
        if (clean.startsWith('label:')) rootActions.push({ label: clean.replace('label:', '').trim().replace(/^['"]|['"]$/g, '') });
      } else if (rootActions.length > 0 && trimmed.startsWith('action:')) {
        rootActions[rootActions.length - 1].action = trimmed.replace('action:', '').trim().replace(/^['"]|['"]$/g, '');
      } else if (rootActions.length > 0 && trimmed.startsWith('target:')) {
        rootActions[rootActions.length - 1].target = trimmed.replace('target:', '').trim().replace(/^['"]|['"]$/g, '');
      }
    }

    // Parse Root Blocks
    if (inBlocks) {
      if (trimmed.startsWith('-')) {
        if (currentBlock && (currentBlock.type || currentBlock.title)) {
          blocks.push(currentBlock);
        }
        currentBlock = { title: '', type: '', roles: [], props: {} };
        inBlockProps = false;
        inBlockRoles = false;

        const cleanTrimmed = trimmed.replace(/^-\s*/, '');
        if (cleanTrimmed.startsWith('id:')) {
          currentBlock.id = cleanTrimmed.replace('id:', '').trim().replace(/^['"]|['"]$/g, '');
        } else if (cleanTrimmed.startsWith('title:')) {
          currentBlock.title = cleanTrimmed.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
        } else if (cleanTrimmed.startsWith('type:')) {
          currentBlock.type = cleanTrimmed.replace('type:', '').trim().replace(/^['"]|['"]$/g, '');
        }
        const rolesMatch = cleanTrimmed.match(/roles\s*:\s*\[(.*)\]/);
        if (rolesMatch) {
          currentBlock.roles = rolesMatch[1].split(',').map(r => r.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        }
        const propsMatch = cleanTrimmed.match(/props:\s*({.+})/);
        if (propsMatch) {
          try { currentBlock.props = JSON.parse(propsMatch[1]); } catch {}
        }
      } else if (currentBlock) {
        if (trimmed.startsWith('id:')) {
          currentBlock.id = trimmed.replace('id:', '').trim().replace(/^['"]|['"]$/g, '');
          inBlockProps = false;
          inBlockRoles = false;
        } else if (trimmed.startsWith('title:')) {
          currentBlock.title = trimmed.replace('title:', '').trim().replace(/^['"]|['"]$/g, '');
          inBlockProps = false;
          inBlockRoles = false;
        } else if (trimmed.startsWith('type:')) {
          currentBlock.type = trimmed.replace('type:', '').trim().replace(/^['"]|['"]$/g, '');
          inBlockProps = false;
          inBlockRoles = false;
        } else if (trimmed.startsWith('roles:')) {
          const rolesMatch = trimmed.match(/roles\s*:\s*\[(.*)\]/);
          if (rolesMatch) {
            currentBlock.roles = rolesMatch[1].split(',').map(r => r.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
            inBlockRoles = false;
          } else {
            inBlockRoles = true;
            inBlockProps = false;
          }
        } else if (inBlockRoles && trimmed.startsWith('-')) {
          const roleVal = trimmed.replace(/^-\s*/, '').trim().replace(/^['"]|['"]$/g, '');
          if (roleVal) currentBlock.roles.push(roleVal);
        } else if (trimmed.startsWith('props:')) {
          const propsMatch = trimmed.match(/props:\s*({.+})/);
          if (propsMatch) {
            try { currentBlock.props = JSON.parse(propsMatch[1]); } catch {}
            inBlockProps = false;
          } else {
            inBlockProps = true;
            inBlockRoles = false;
          }
        } else if (inBlockProps) {
          const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)/);
          if (kvMatch) {
            const [_, k, v] = kvMatch;
            const cleanVal = v.trim().replace(/^['"]|['"]$/g, '');
            if (cleanVal.startsWith('[') && cleanVal.endsWith(']')) {
              currentBlock.props[k] = cleanVal.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
            } else if (cleanVal === 'true') currentBlock.props[k] = true;
            else if (cleanVal === 'false') currentBlock.props[k] = false;
            else if (!isNaN(Number(cleanVal)) && cleanVal !== '') currentBlock.props[k] = Number(cleanVal);
            else currentBlock.props[k] = cleanVal;
          }
        }
      }
    }
  }

  if (currentBlock && (currentBlock.type || currentBlock.title)) {
    blocks.push(currentBlock);
  }

  const finalBlocks = blocks.length > 0 ? blocks : (lifeModes.length > 0 ? lifeModes[0].blocks : []);
  return { title, lifeModes, blocks: finalBlocks, chips: rootChips, actions: rootActions };
}

