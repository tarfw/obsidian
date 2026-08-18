/**
 * OKF (Open Knowledge Format) file storage and integration.
 * Workspace OKF files stored in Railway S3 (Tigris-backed).
 *
 * S3 structure:
 *   workspaces/{scope}/index.md        — workspace root (per-workspace, editable)
 *   workspaces/{scope}/skills/{mod}.md — workspace skill files (AI-generated)
 *   workspaces/{scope}/site/           — brand.md, design.md, layouts/
 */

import { s3Put, s3Get, s3Delete, s3List } from './s3-client';
import { CORE_MODULES } from './core-modules';
import { getCoreModuleSpecs, composeWorkspacePrompt, parseComposedWorkspace } from './module-composer';
import { validateDesignTokens, validateSkill } from './schema-validator';
import { parseDesignMD } from './design-md-parser';
import { parseSkillMarkdown } from './skill-parser';
import type { ExtractedBusiness } from './extract-business';

// S3 keys use clean subdomain without w: or s: prefixes
function s3Scope(scope: string): string {
  return scope.replace(/^[ws]:/, '').replace(/:/g, '-');
}

// ── Write ──────────────────────────────────────────────────────────

export async function uploadWorkspaceFile(
  env: any,
  scope: string,
  path: string,
  content: string
): Promise<{ s3Key: string }> {
  const s3Key = `workspaces/${s3Scope(scope)}/${path}`;
  await s3Put(env, s3Key, content);
  return { s3Key };
}

// ── Read ───────────────────────────────────────────────────────────

export async function readWorkspaceFile(env: any, scope: string, path: string): Promise<string | null> {
  const content = await s3Get(env, `workspaces/${s3Scope(scope)}/${path}`);
  if (content !== null) return content;
  // Fallback for legacy workspaces created with w- prefix
  const legacyScope = scope.replace(/:/g, '-');
  if (legacyScope !== s3Scope(scope)) {
    return s3Get(env, `workspaces/${legacyScope}/${path}`);
  }
  return null;
}

export async function readWorkspaceIndex(env: any, scope: string): Promise<string | null> {
  return readWorkspaceFile(env, scope, 'index.md');
}

export async function readWithFallback(
  env: any,
  scope: string,
  path: string
): Promise<string | null> {
  const wsContent = await readWorkspaceFile(env, scope, path);
  if (wsContent !== null) return wsContent;

  // Extract file basename to match core module if it's under skills/
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  const modName = filename.replace('.md', '');
  
  if (modName in CORE_MODULES) {
    return CORE_MODULES[modName];
  }

  return null;
}

// ── Delete ─────────────────────────────────────────────────────────

export async function deleteWorkspaceFile(env: any, scope: string, path: string): Promise<boolean> {
  return s3Delete(env, `workspaces/${s3Scope(scope)}/${path}`);
}

// ── List ───────────────────────────────────────────────────────────

export async function listWorkspaceModules(env: any, scope: string): Promise<string[]> {
  const keys = await s3List(env, `workspaces/${s3Scope(scope)}/skills/`);
  return keys
    .map(k => k.split('/').pop()!)
    .filter(name => name.endsWith('.md'))
    .map(name => name.replace('.md', ''));
}

/**
 * Initializes workspace by composing all required specs via one LLM call.
 * AI picks modules based on business description, generates SKILL.md files.
 */
export async function initWorkspace(
  env: any,
  scope: string,
  workspaceName: string,
  modules: string[],
  businessDescription?: string
): Promise<void> {
  const groqKey = env.GROQ_API_KEY;
  let compositionDone = false;

  if (groqKey) {
    try {
      const specs = getCoreModuleSpecs(modules);
      const prompt = composeWorkspacePrompt(
        {
          name: workspaceName,
          subdomain: scope.replace('w:', ''),
          modules,
          description: businessDescription,
        },
        specs
      );

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 6000,
        }),
      });

      if (res.ok) {
        const data = await res.json() as any;
        const llmOutput = data?.choices?.[0]?.message?.content;
        if (llmOutput) {
          const files = parseComposedWorkspace(llmOutput);

          // Validate and write generated files
          for (const [path, content] of Object.entries(files)) {
            let isValid = true;

            if (path === 'DESIGN.md') {
              const tokens = parseDesignMD(content);
              isValid = validateDesignTokens(tokens).success;
            } else if (path.startsWith('skills/')) {
              const parsed = parseSkillMarkdown(content);
              isValid = validateSkill(parsed).success;
            }

            if (isValid) {
              await uploadWorkspaceFile(env, scope, path, content);
            } else {
              console.warn(`[composer] Spec validation failed for ${path}, writing default fallback.`);
            }
          }
          compositionDone = true;
        }
      }
    } catch (err) {
      console.warn('[composer] Composed initialization failed, running fallback:', err);
    }
  }

  // Self-healing fallback if LLM or validation failed
  if (!compositionDone) {
    console.warn('[composer] Using default fallback.');
    
    // 1. DESIGN.md default
    const defaultDesign = `---
name: ${workspaceName}
version: 1.0.0
colors:
  primary: "#1B4332"
  secondary: "#2D6A4F"
  tertiary: "#D4A373"
  neutral: "#FEFAE0"
  on-primary: "#FFFFFF"
typography:
  h1: { fontFamily: "Inter", fontSize: "1.75rem", fontWeight: 700 }
  body-md: { fontFamily: "Inter", fontSize: "0.938rem", fontWeight: 400 }
rounded: { sm: "6px", md: "12px", lg: "16px" }
spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px" }
components:
  action-button:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
---
`;
    await uploadWorkspaceFile(env, scope, 'DESIGN.md', defaultDesign);

    // 2. Copy core modules as fallback
    for (const mod of modules) {
      if (mod in CORE_MODULES) {
        await uploadWorkspaceFile(env, scope, `skills/${mod}.md`, CORE_MODULES[mod]);
      }
    }
  }

  // 3. Always write index.md listing all modules
  const moduleLinks = modules.map(m => `- [${m}](./skills/${m}.md)`).join('\n');
  const rootIndex = `# ${workspaceName}\n\n**Modules:** ${modules.join(', ')}\n\n## Modules\n${moduleLinks}\n`;
  await uploadWorkspaceFile(env, scope, 'index.md', rootIndex);
}

// ── OKF Folder Scaffolder ───────────────────────────────────────────
// Creates the full OKF folder structure + index.md per folder

export async function scaffoldOkfFolders(
  env: any,
  scope: string,
  workspaceName: string,
  modules: string[]
): Promise<void> {
  // 1. Root index.md (plan6.md §4 WorkspaceRoot)
  const rootIndex = `---
type: WorkspaceRoot
name: "${workspaceName}"
subdomain: "${s3Scope(scope)}"
modules: [${modules.map(m => `"${m}"`).join(', ')}]
tier: "free"
created_at: "${new Date().toISOString()}"
---

# ${workspaceName}

Welcome to ${workspaceName}. This workspace is powered by Tar Operating System.

## Active Modules
${modules.map(m => `- **${m.charAt(0).toUpperCase() + m.slice(1)}**: [skills/${m}.md](./skills/${m}.md)`).join('\n')}
`;
  await uploadWorkspaceFile(env, scope, 'index.md', rootIndex);

  // 2. Root types.md (plan6.md canonical type map)
  const typesMd = `# types.md — Canonical Type Map (plan6.md)

## Matter Types
1 = person
2 = company
3 = product
4 = service
5 = listing
6 = document
7 = asset
8 = location
9 = flow_def
10 = flow
11 = note
12 = goal
13 = expense
14 = order

## Motion Types
101 = sale
102 = refund
103 = quote
104 = invoice
105 = purchase_order
106 = vendor_bill
107 = payment
108 = stock_receive
109 = stock_transfer
110 = stock_adjust
111 = stock_writeoff
112 = booking
113 = booking_cancel
114 = shipment
115 = delivery
116 = activity
117 = assignment
118 = clock_in
119 = clock_out
120 = flow_stage
121 = flow_complete
122 = flow_dropped
123 = status_change
124 = order_placed
125 = order_ready
126 = order_served

## Inbox Types
1 = task
2 = alert
3 = approval
4 = reminder
5 = notification
6 = suggestion

## Graph Rel Types
1 = placed_by
3 = fulfills
4 = works_at
5 = assigned_to
6 = stored_at
7 = from
8 = for_contact
9 = in_flow
10 = owned_by
11 = about
12 = member_of
13 = linked_to
14 = variant_of
15 = served_by
`;
  await uploadWorkspaceFile(env, scope, 'types.md', typesMd);

  // 3. business/profile.md
  const profileMd = `---
type: BusinessProfile
name: "${workspaceName}"
currency: "USD"
tax_rate: 0.05
---

# ${workspaceName} Profile

| Attribute | Details |
|---|---|
| Business Name | ${workspaceName} |
| Currency | USD |
| Tax Rate | 5% |
| Operating Hours | 09:00 - 22:00 |
`;
  await uploadWorkspaceFile(env, scope, 'business/profile.md', profileMd);

  // 4. people/roles.md (Role Blueprints)
  const rolesMd = `---
type: RoleBlueprints
roles:
  waiter:
    label: "Floor Waiter"
    modules: ["table_grid", "order_tracker"]
    permissions: ["create_order", "view_menu", "table_status"]
  chef:
    label: "Kitchen Chef"
    modules: ["order_queue", "prep_timer"]
    permissions: ["mark_ready", "view_tickets"]
  cashier:
    label: "Cashier & Billing"
    modules: ["payment_terminal", "daily_sales"]
    permissions: ["process_payment", "print_receipt", "daily_close"]
  manager:
    label: "Operations Manager"
    modules: ["daily_sales", "inventory_audit", "team_roster"]
    permissions: ["all"]
---

# Role Blueprints
Defines operational permissions and canvas modules for each role in the workspace.
`;
  await uploadWorkspaceFile(env, scope, 'people/roles.md', rolesMd);

  // 5. team/members.md
  const defaultMembers = `---
type: TeamConfiguration
title: Team Access & Channel Mappings
timestamp: "${new Date().toISOString()}"
roles:
  staff: [orders, inventory]
  manager: [*]
members: []
---

# Channel Mappings

| Channel Name | Platform | Channel ID | Mapped Role |
|--------------|----------|------------|-------------|
`;
  await uploadWorkspaceFile(env, scope, 'team/members.md', defaultMembers);

  // 6. team/canvas.md — 3-Zone Declarative Blueprint (genui.md §2, §5, §8)
  const isOrdersWs = modules.includes('orders') || modules.includes('transactions') || modules.includes('pos');
  const isBookingsWs = modules.includes('bookings') || modules.includes('appointments') || modules.includes('schedule');

  let defaultChipsYaml = `chips:
  - label: "New Sale"
    target: "quick-pos"
  - label: "Check Stock"
    target: "stock-sheet"
  - label: "Contacts"
    target: "contact-card"`;

  if (isBookingsWs && !isOrdersWs) {
    defaultChipsYaml = `chips:
  - label: "New Booking"
    target: "data-grid"
  - label: "Client Directory"
    target: "contact-card"
  - label: "Services"
    target: "data-grid"`;
  }

  const primaryToolBlock = isOrdersWs
    ? `  - title: "Quick Billing"
    type: "quick-pos"
    props:
      title: "Quick Billing"
      subtitle: "Floor Tables & Register"
      catalogType: "product"
      taxRate: 0.05`
    : isBookingsWs
    ? `  - title: "Appointments Calendar"
    type: "data-grid"
    props:
      title: "Schedule & Bookings"
      type: "booking"
      mode: "calendar"`
    : `  - title: "Inventory Counter"
    type: "stock-sheet"
    props:
      title: "Inventory Stock Sheet"
      subtitle: "Tap - / + to adjust quantity"`;

  const defaultCanvas = `---
type: CanvasLayout
title: "${workspaceName} Canvas"
timestamp: "${new Date().toISOString()}"
${defaultChipsYaml}
blocks:
  - title: "Action Inbox"
    type: "task-inbox"
    props:
      title: "Action Inbox"
  - title: "Today's Revenue"
    type: "stat-counter"
    props:
      title: "${workspaceName} Revenue"
      subtitle: "Live Operations"
${primaryToolBlock}
---

# Workspace Canvas
`;
  await uploadWorkspaceFile(env, scope, 'team/canvas.md', defaultCanvas);

  // 7. Core skills based on active modules
  for (const mod of modules) {
    if (mod in CORE_MODULES) {
      await uploadWorkspaceFile(env, scope, `skills/${mod}.md`, CORE_MODULES[mod]);
    }
  }

  // 8. wiki/policies/returns.md & wiki/faqs/common.md
  const returnsMd = `# Return & Service Policy\n\nStandard customer return and cancellation policy for ${workspaceName}.\n`;
  await uploadWorkspaceFile(env, scope, 'wiki/policies/returns.md', returnsMd);

  const faqsMd = `# Common FAQs\n\nQ: What are the hours?\nA: 09:00 - 22:00 daily.\n`;
  await uploadWorkspaceFile(env, scope, 'wiki/faqs/common.md', faqsMd);
}

// ── OKF Content Generator ───────────────────────────────────────────
// Generates profile.md, catalog.md, members.md, brand.md, design.md, home.json from extracted business data

export async function generateOkfContent(
  env: any,
  scope: string,
  business: ExtractedBusiness,
  modules: string[],
  userId: string
): Promise<void> {
  const wsName = business.name;

  // business/profile.md
  const profileMd = `# Business Profile

| Field | Value |
|-------|-------|
| Name | ${wsName} |
| Type | ${business.type} |
| Location | ${business.location || 'Not specified'} |
| Hours | ${business.hours || 'Not specified'} |
| Description | ${business.description || 'Not specified'} |
`;
  await uploadWorkspaceFile(env, scope, 'business/profile.md', profileMd);

  // products/catalog.md
  const allItems = [...business.products, ...business.services];
  if (allItems.length > 0) {
    const rows = allItems.map(item =>
      `| ${item.name} | ₹${item.price || 0} | ${item.description || ''} |`
    ).join('\n');
    const catalogMd = `# Products & Services\n\n| Item | Price | Description |\n|------|-------|-------------|\n${rows}\n`;
    await uploadWorkspaceFile(env, scope, 'products/catalog.md', catalogMd);
  }

  // policies/return.md
  if (business.policies.return) {
    await uploadWorkspaceFile(env, scope, 'policies/return.md', `# Return Policy\n\n${business.policies.return}\n`);
  }

  // policies/delivery.md
  if (business.policies.delivery) {
    await uploadWorkspaceFile(env, scope, 'policies/delivery.md', `# Delivery Policy\n\n${business.policies.delivery}\n`);
  }

  // faqs/common.md
  if (business.faqs.length > 0) {
    const faqMd = `# FAQs\n\n${business.faqs.map(f => `## ${f.q}\n${f.a}`).join('\n\n')}\n`;
    await uploadWorkspaceFile(env, scope, 'faqs/common.md', faqMd);
  }

  // team/members.md
  const membersMd = `# Team Members\n\n| Name | Role | User ID |\n|------|------|---------|\n| ${wsName} Owner | owner | ${userId} |\n`;
  await uploadWorkspaceFile(env, scope, 'team/members.md', membersMd);

  // site/brand.md
  const primaryColor = business.brand_color || '#1B4332';
  const headingFont = business.typography.heading || 'Inter';
  const bodyFont = business.typography.body || 'Inter';
  const brandMd = `---
colors:
  primary: "${primaryColor}"
  secondary: "#1B2A33"
fonts:
  heading: ${headingFont}
  body: ${bodyFont}
---\n`;
  await uploadWorkspaceFile(env, scope, 'site/brand.md', brandMd);

  // site/design.md
  const designMd = `---
name: ${wsName}
version: 1.0.0
colors:
  primary: "${primaryColor}"
  secondary: "#1B2A33"
  tertiary: "#D4A373"
  neutral: "#FEFAE0"
  on-primary: "#FFFFFF"
typography:
  h1: { fontFamily: "${headingFont}", fontSize: "1.75rem", fontWeight: 700 }
  body: { fontFamily: "${bodyFont}", fontSize: "0.938rem", fontWeight: 400 }
rounded: { sm: "6px", md: "12px", lg: "16px" }
spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px" }
components:
  action-button:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
---\n`;
  await uploadWorkspaceFile(env, scope, 'site/design.md', designMd);

  // site/layouts/home.json — auto-generate from business data
  const menuItems = business.products.map(p => ({ name: p.name, price: `₹${p.price}` }));
  const serviceItems = business.services.map(s => ({ name: s.name, price: `₹${s.price}` }));
  const allMenuItems = [...menuItems, ...serviceItems];

  const homeJson: any = {
    workspaceId: scope.replace('w:', ''),
    target: 'web',
    revision: 'v1',
    routes: [{
      path: '/',
      nodes: [
        {
          id: 'hero',
          type: 'hero_banner',
          layout: 'centered',
          props: {
            title: wsName,
            subtitle: business.description || `${business.type} in ${business.location}`,
          },
        },
      ],
    }],
  };

  // Add about section if description or hours exist
  if (business.description || business.hours) {
    const aboutChildren: any[] = [];
    if (business.description) {
      aboutChildren.push({
        id: 'about-text',
        type: 'text_block',
        layout: 'text-only',
        props: { heading: 'About Us', body: business.description },
      });
    }
    if (business.hours) {
      aboutChildren.push({
        id: 'about-hours',
        type: 'text_block',
        layout: 'text-only',
        props: { heading: 'Hours', body: business.hours },
      });
    }
    homeJson.routes[0].nodes.push({
      id: 'about',
      type: 'content_grid',
      layout: aboutChildren.length > 1 ? '2-col' : '1-col',
      children: aboutChildren,
    });
  }

  // Add product/service grid if items exist
  if (allMenuItems.length > 0) {
    homeJson.routes[0].nodes.push({
      id: 'menu',
      type: 'product_grid',
      layout: allMenuItems.length <= 2 ? '2-col' : '3-col',
      props: { items: allMenuItems, columns: Math.min(allMenuItems.length, 3) },
    });
  }

  // Add FAQ section if FAQs exist
  if (business.faqs.length > 0) {
    homeJson.routes[0].nodes.push({
      id: 'faq',
      type: 'faq_accordion',
      layout: 'single-column',
      props: { items: business.faqs },
    });
  }

  // Add contact form
  homeJson.routes[0].nodes.push({
    id: 'contact',
    type: 'contact_form',
    layout: 'centered',
    props: { fields: ['name', 'phone', 'message'], submit_label: 'Send' },
  });

  // Add footer
  homeJson.routes[0].nodes.push({
    id: 'footer',
    type: 'footer',
    layout: 'multi-column',
    props: { links: ['/'], social: [] },
  });

  await uploadWorkspaceFile(env, scope, 'site/layouts/home.json', JSON.stringify(homeJson, null, 2));
}

// ── Canvas Block Operations ──────────────────────────────────────────

export async function addCanvasBlock(
  env: any,
  scope: string,
  moduleOrBlock: string | { title?: string; type: string; props?: Record<string, any> }
): Promise<{ ok: boolean }> {
  const canvasContent = await readWorkspaceFile(env, scope, 'team/canvas.md');
  const modId = typeof moduleOrBlock === 'string' ? moduleOrBlock.toLowerCase() : (moduleOrBlock.props?.type || moduleOrBlock.type).toLowerCase();
  
  let title = typeof moduleOrBlock === 'string'
    ? modId.charAt(0).toUpperCase() + modId.slice(1) + ' List'
    : (moduleOrBlock.title || modId);
  let blockType = 'data-grid';
  let propsObj: Record<string, any> = { type: modId, mode: 'table' };

  if (modId === 'orders' || modId === 'order' || modId === 'sale') {
    title = 'Orders Tool';
    blockType = 'pos-sale';
    propsObj = { catalogType: 'product', taxRate: 0.05 };
  } else if (modId === 'inventory' || modId === 'product') {
    title = 'Inventory List';
    blockType = 'data-grid';
    propsObj = { type: 'product', mode: 'table' };
  } else if (modId === 'bookings' || modId === 'booking') {
    title = 'Bookings List';
    blockType = 'data-grid';
    propsObj = { type: 'booking', mode: 'calendar' };
  } else if (modId === 'crm' || modId === 'contact' || modId === 'customer') {
    title = 'CRM List';
    blockType = 'data-grid';
    propsObj = { type: 'crm', mode: 'table' };
  } else if (modId === 'reports' || modId === 'report' || modId === 'metrics') {
    title = 'Daily Sales';
    blockType = 'metric-card';
    propsObj = { title: 'Daily Sales', type: 'report' };
  } else if (modId === 'tables' || modId === 'table') {
    title = 'Table Grid POS';
    blockType = 'data-grid';
    propsObj = { type: 'table', mode: 'grid' };
  } else if (modId === 'expenses' || modId === 'expense') {
    title = 'Expense Tracker';
    blockType = 'data-grid';
    propsObj = { type: 'expense', mode: 'table' };
  }

  if (typeof moduleOrBlock === 'object') {
    if (moduleOrBlock.title) title = moduleOrBlock.title;
    if (moduleOrBlock.type) blockType = moduleOrBlock.type;
    if (moduleOrBlock.props) propsObj = moduleOrBlock.props;
  }

  // Parse existing blocks from YAML frontmatter
  let existingBlocks: Array<{ title: string; type: string; props: Record<string, any> }> = [];
  if (canvasContent) {
    const match = canvasContent.match(/blocks:\s*\n([\s\S]*?)(?:---|\n\n#|$)/);
    if (match && match[1]) {
      const blockEntries = match[1].split(/\n\s*-\s+/).filter(Boolean);
      for (const entry of blockEntries) {
        const eTitle = (entry.match(/title:\s*["']?([^"'\n]+)["']?/) || [])[1]?.trim() || '';
        const eType = (entry.match(/type:\s*["']?([^"'\n]+)["']?/) || [])[1]?.trim() || 'data-grid';
        let eProps: any = {};
        const propsMatch = entry.match(/props:\s*(\{.*\})/);
        if (propsMatch) {
          try { eProps = JSON.parse(propsMatch[1]); } catch {}
        }
        if (eTitle || eType) {
          existingBlocks.push({ title: eTitle, type: eType, props: eProps });
        }
      }
    }
  }

  // Check if module already exists by title or props.type
  const alreadyExists = existingBlocks.some(b => 
    b.title.toLowerCase() === title.toLowerCase() ||
    (b.props?.type && String(b.props.type).toLowerCase() === modId) ||
    ((b.type === 'quick-pos' || b.type === 'pos-sale') && (modId === 'orders' || modId === 'order'))
  );

  if (!alreadyExists) {
    existingBlocks.push({ title, type: blockType, props: propsObj });
  }

  // Serialize updated canvas.md
  const blocksYaml = existingBlocks.map(b => 
    `  - title: "${b.title}"\n    type: "${b.type}"\n    props: ${JSON.stringify(b.props)}`
  ).join('\n');

  const sScope = s3Scope(scope);
  const updatedContent = `---
type: CanvasLayout
title: "${sScope} Canvas"
timestamp: "${new Date().toISOString()}"
blocks:
${blocksYaml}
---

# Workspace Canvas
`;

  await uploadWorkspaceFile(env, scope, 'team/canvas.md', updatedContent);
  return { ok: true };
}

export async function removeCanvasBlock(
  env: any,
  scope: string,
  moduleOrTitle: string
): Promise<{ ok: boolean }> {
  const canvasContent = await readWorkspaceFile(env, scope, 'team/canvas.md');
  if (!canvasContent) return { ok: true };

  const target = moduleOrTitle.toLowerCase().trim();

  let existingBlocks: Array<{ title: string; type: string; props: Record<string, any> }> = [];
  const match = canvasContent.match(/blocks:\s*\n([\s\S]*?)(?:---|\n\n#|$)/);
  if (match && match[1]) {
    const blockEntries = match[1].split(/\n\s*-\s+/).filter(Boolean);
    for (const entry of blockEntries) {
      const eTitle = (entry.match(/title:\s*["']?([^"'\n]+)["']?/) || [])[1]?.trim() || '';
      const eType = (entry.match(/type:\s*["']?([^"'\n]+)["']?/) || [])[1]?.trim() || 'data-grid';
      let eProps: any = {};
      const propsMatch = entry.match(/props:\s*(\{.*\})/);
      if (propsMatch) {
        try { eProps = JSON.parse(propsMatch[1]); } catch {}
      }
      if (eTitle || eType) {
        existingBlocks.push({ title: eTitle, type: eType, props: eProps });
      }
    }
  }

  const filtered = existingBlocks.filter(b => {
    const bTitle = b.title.toLowerCase();
    const bType = (b.props?.type || b.type || '').toLowerCase();
    return !bTitle.includes(target) && !bType.includes(target);
  });

  const blocksYaml = filtered.map(b => 
    `  - title: "${b.title}"\n    type: "${b.type}"\n    props: ${JSON.stringify(b.props)}`
  ).join('\n');

  const sScope = s3Scope(scope);
  const updatedContent = `---
type: CanvasLayout
title: "${sScope} Canvas"
timestamp: "${new Date().toISOString()}"
blocks:
${blocksYaml}
---

# Workspace Canvas
`;

  await uploadWorkspaceFile(env, scope, 'team/canvas.md', updatedContent);
  return { ok: true };
}

// ── Catalog 100-Item Chunking Operations (plan6.md §5) ───────────────

export interface CatalogProductDef {
  sku: string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  min_stock?: number;
  options?: string[];
  image?: string;
}

/**
 * Determine chunk filename for a product based on category or SKU index.
 */
function getProductChunkFilename(category?: string): string {
  if (!category) return 'products/general.md';
  const cleanCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '_').trim();
  return `products/${cleanCategory || 'general'}.md`;
}

/**
 * Save or update a product in OKF catalog with automatic 100-item chunking.
 */
export async function saveCatalogProduct(
  env: any,
  scope: string,
  product: CatalogProductDef
): Promise<{ ok: boolean; chunkFile: string }> {
  const chunkFile = getProductChunkFilename(product.category);

  // 1. Read or initialize products/index.md
  let indexContent = await readWorkspaceFile(env, scope, 'products/index.md') || '# Product Index\n\n| SKU | Name | Category | Chunk |\n|---|---|---|---|\n';

  // 2. Read or initialize target chunk file
  let chunkContent = await readWorkspaceFile(env, scope, chunkFile) || `# Products: ${product.category || 'General'}\n\n`;

  // 3. Format product YAML frontmatter / block
  const prodBlock = `
## ${product.name} (SKU: ${product.sku})
- **SKU**: ${product.sku}
- **Category**: ${product.category || 'General'}
- **Default Price**: $${product.price ?? 0}
- **Min Stock Threshold**: ${product.min_stock ?? 5}
- **Description**: ${product.description || ''}
${product.options && product.options.length ? `- **Options**: ${product.options.join(', ')}` : ''}
`;

  // Update chunk content (replace if existing SKU found, else append)
  const skuRegex = new RegExp(`## .*?\\(SKU: ${product.sku}\\)[\\s\\S]*?(?=(?:\\n## |$))`, 'i');
  if (skuRegex.test(chunkContent)) {
    chunkContent = chunkContent.replace(skuRegex, prodBlock.trim());
  } else {
    chunkContent += `\n${prodBlock.trim()}\n`;
  }

  // Update products/index.md
  const indexRow = `| ${product.sku} | ${product.name} | ${product.category || 'General'} | ${chunkFile} |`;
  const indexRowRegex = new RegExp(`\\|\\s*${product.sku}\\s*\\|.*\\|`, 'i');
  if (indexRowRegex.test(indexContent)) {
    indexContent = indexContent.replace(indexRowRegex, indexRow);
  } else {
    indexContent += `${indexRow}\n`;
  }

  // Upload chunk file and index
  await uploadWorkspaceFile(env, scope, chunkFile, chunkContent);
  await uploadWorkspaceFile(env, scope, 'products/index.md', indexContent);

  return { ok: true, chunkFile };
}

/**
 * Read product definition from OKF chunked files.
 */
export async function readCatalogProduct(
  env: any,
  scope: string,
  sku: string
): Promise<CatalogProductDef | null> {
  const indexContent = await readWorkspaceFile(env, scope, 'products/index.md');
  if (!indexContent) return null;

  // Find chunk file for SKU from index
  const lines = indexContent.split('\n');
  let targetChunk = '';
  for (const line of lines) {
    if (line.includes(`| ${sku} `) || line.includes(`|${sku}|`)) {
      const parts = line.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 4) {
        targetChunk = parts[3];
      }
      break;
    }
  }

  if (!targetChunk) targetChunk = 'products/general.md';
  const chunkContent = await readWorkspaceFile(env, scope, targetChunk);
  if (!chunkContent) return null;

  const skuMatch = chunkContent.match(new RegExp(`## (.*?)\\s*\\(SKU: ${sku}\\)[\\s\\S]*?(?=(?:\\n## |$))`, 'i'));
  if (!skuMatch) return null;

  const blockText = skuMatch[0];
  const name = skuMatch[1];
  const catMatch = blockText.match(/\*\*Category\*\*:\s*(.*)/i);
  const priceMatch = blockText.match(/\*\*Default Price\*\*:\s*\$?([\d.]+)/i);
  const descMatch = blockText.match(/\*\*Description\*\*:\s*(.*)/i);

  return {
    sku,
    name: name.trim(),
    category: catMatch ? catMatch[1].trim() : undefined,
    price: priceMatch ? parseFloat(priceMatch[1]) : 0,
    description: descMatch ? descMatch[1].trim() : undefined,
  };
}


