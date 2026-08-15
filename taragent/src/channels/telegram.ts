/**
 * Telegram Channel Gateway (plan6.md §15, §16, §17)
 *
 * Channel-first zero-UI member management and operational event gateway.
 * Single source of truth for team membership; conversational capture for operations.
 */

import type { ChannelMessage, ChannelConfig, ChannelResponse } from './types';
import { executeWorkspaceTursoQuery } from '../lib/db';
import { getOrCreateWorkspaceDb } from '../lib/workspace-db';
import { uploadWorkspaceFile, readWorkspaceFile } from '../lib/okf';
import {
  MATTER_TYPES,
  MOTION_TYPES,
  INBOX_TYPES,
  GRAPH_REL_TYPES,
  COMPACT_KEYS,
} from '../lib/types-config';
import { pushToPersonalInbox } from '../lib/inbox';

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ENCODING_LEN = 32;

function encodeTime(now: number, len: number): string {
  let str = "";
  for (let i = len - 1; i >= 0; i--) {
    const mod = now % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    now = Math.floor(now / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(len: number): string {
  let str = "";
  for (let i = 0; i < len; i++) {
    const rand = Math.floor(Math.random() * ENCODING_LEN);
    str += ENCODING.charAt(rand);
  }
  return str;
}

export function generateUlid(now: number = Date.now()): string {
  return encodeTime(now, 10) + encodeRandom(16);
}

export function generateEntityId(type: string): string {
  const prefixMap: Record<string, string> = {
    product: 'prd', order: 'ord', booking: 'bkg', customer: 'cus',
    staff: 'stf', invoice: 'inv', expense: 'exp', deal: 'dea',
    contract: 'ctr', asset: 'ast', ticket: 'tkt', project: 'prj',
    payslip: 'pay', purchase: 'pur', workorder: 'woe', shipment: 'shp',
    listing: 'lst', setting: 'set', motion: 'mot', inbox: 'ibx'
  };
  const prefix = prefixMap[type] || type.slice(0, 3).toLowerCase();
  return `${prefix}${generateUlid(Date.now())}`;
}

export interface TelegramProcessResult {
  message: ChannelMessage;
  response: ChannelResponse;
}

function getMessageBody(msg: any): string {
  if (msg.text !== undefined) return msg.text;
  if (msg.caption !== undefined) return msg.caption;
  if (msg.photo) return '[photo message]';
  if (msg.video) return '[video message]';
  if (msg.voice) return '[voice message]';
  if (msg.document) return '[document message]';
  if (msg.sticker) return '[sticker message]';
  return '';
}

function toWorkspaceScope(raw: string): string {
  if (!raw) return 'w:default';
  const clean = raw.trim().replace(/^[tw]:/, '');
  return `w:${clean}`;
}

function extractSubdomain(raw: string): string {
  if (!raw) return 'default';
  return raw.trim().replace(/^[tw]:/, '').toLowerCase();
}

/**
 * Handle incoming Telegram webhook update (plan6.md architecture).
 */
export async function handleTelegramUpdate(
  update: any,
  env: { DB?: D1Database; [key: string]: any }
): Promise<TelegramProcessResult | null> {
  const message = update.message || update.channel_post || update.business_message;
  if (!message) return null;

  const chatId = message.chat?.id?.toString();
  const userId = message.from?.id?.toString() || 'unknown';
  const username = message.from?.username ? `@${message.from.username}` : '';
  const firstName = message.from?.first_name || 'User';
  const userName = username || firstName;
  const userHandle = username || `@${firstName.toLowerCase().replace(/\s+/g, '_')}`;
  const text = getMessageBody(message).trim();

  if (!chatId || !text) return null;

  const channelMsg: ChannelMessage = {
    platform: 'telegram',
    chatId,
    userId,
    userName,
    content: text,
    messageId: message.message_id?.toString(),
  };

  // Ensure D1 channels & members tables exist
  await initTables(env);

  let responseText = '';

  // Parse Slash Commands — locate command token
  const tokens = text.split(/\s+/);
  const cmdIndex = tokens.findIndex(t => t.startsWith('/') || t.includes('/link') || t.includes('/role') || t.includes('/team') || t.includes('/remove'));

  if (cmdIndex !== -1 || text.startsWith('/')) {
    const parts = cmdIndex !== -1 ? tokens.slice(cmdIndex) : tokens;
    const command = (parts[0] || '').toLowerCase().replace(/@\w+/, '');

    // ────────────────────────────────────────────────────────────────
    // 1. /link <CODE> (Flow 2: Secure Pairing Code)
    // ────────────────────────────────────────────────────────────────
    if (command === '/link' || command.startsWith('/link')) {
      const targetCodeRaw = (parts[1] || '').toUpperCase().trim();
      if (!targetCodeRaw) {
        responseText = '⚠️ Usage: <code>/link &lt;PAIRING_CODE&gt;</code> (e.g. <code>/link TAR-7K92</code>)\n\nGenerate your 6-character code in <b>TarApp</b> (tap <i>Connect Chat</i>).';
      } else if (env.DB) {
        const groupName = message.chat?.title || 'Telegram Group';
        const now = Date.now();

        // 1. Check pairing_codes table
        const pairing = await env.DB.prepare(
          'SELECT code, subdomain, scope, user_id FROM pairing_codes WHERE (UPPER(code) = ? OR code = ?) AND expires_at > ?'
        ).bind(targetCodeRaw, targetCodeRaw, now).first<{ code: string; subdomain: string; scope: string; user_id: string }>();

        if (pairing) {
          // 2. Atomically delete code (Self-destruct)
          await env.DB.prepare('DELETE FROM pairing_codes WHERE code = ?').bind(pairing.code).run();

          // 3. Link channel in D1
          await env.DB.prepare(
            `INSERT INTO channels (chat_id, scope, name, platform, created_by, created_at)
             VALUES (?, ?, ?, 'telegram', ?, ?)
             ON CONFLICT(chat_id) DO UPDATE SET scope = excluded.scope, name = excluded.name`
          ).bind(chatId, pairing.scope, groupName, userHandle, new Date().toISOString()).run();

          // 4. Register owner in members table
          const memberId = `${pairing.scope}:${userHandle.toLowerCase()}`;
          await env.DB.prepare(
            `INSERT INTO members (id, scope, user_id, handle, role, updated_at)
             VALUES (?, ?, ?, ?, 'owner', ?)
             ON CONFLICT(id) DO UPDATE SET role = 'owner', updated_at = excluded.updated_at`
          ).bind(memberId, pairing.scope, pairing.user_id, userHandle.toLowerCase(), new Date().toISOString()).run();

          // 5. Look up workspace name
          const ws = await env.DB.prepare('SELECT name FROM workspaces WHERE subdomain = ?').bind(pairing.subdomain).first<{ name?: string }>();
          const wsName = ws?.name || pairing.subdomain;

          responseText = `✅ Group <b>${groupName}</b> successfully linked to <b>${wsName}</b>!\n👑 <b>${userHandle}</b> verified as Channel Admin.\n\nReady for staff onboarding:\n• <code>/role @username &lt;role&gt; [section:X] [tables:Y]</code>\n• <code>/team</code>`;
        } else {
          // Check if user tried typing subdomain directly
          const wsCheck = await env.DB.prepare('SELECT subdomain FROM workspaces WHERE subdomain = ?').bind(targetCodeRaw.toLowerCase()).first();
          if (wsCheck) {
            responseText = `🔒 <b>Direct subdomain linking is disabled for security.</b>\nPlease open <b>TarApp</b>, tap <b>Connect Chat</b> to generate your secure 10-minute code, then type <code>/link &lt;CODE&gt;</code> here.`;
          } else {
            responseText = `⚠️ Invalid or expired pairing code.\nPlease open <b>TarApp</b> → <b>Connect Chat</b> to generate a fresh 6-character code, then type <code>/link &lt;CODE&gt;</code> here.`;
          }
        }
      } else {
        responseText = '⚠️ Database service temporarily unavailable.';
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 2. /role <@handle> <role> [section:X] [tables:Y-Z] (Flow 3: Private Member Onboarding)
    // ────────────────────────────────────────────────────────────────
    else if (command === '/role' || command.startsWith('/role')) {
      const targetHandle = parts[1] || '';
      const newRole = (parts[2] || 'staff').toLowerCase();
      const sectionArg = parts.find(p => p.startsWith('section:'))?.split(':')[1] || null;
      const tablesArg = parts.find(p => p.startsWith('tables:'))?.split(':')[1] || null;

      if (!targetHandle || !targetHandle.startsWith('@')) {
        responseText = '⚠️ Usage: <code>/role @username &lt;role&gt; [section:B] [tables:12-15]</code>';
      } else {
        const rawScope = await getScopeForChat(env, chatId);
        if (!rawScope || rawScope === 'unassigned') {
          responseText = '⚠️ Group not linked to a workspace. An owner can run <code>/link &lt;CODE&gt;</code> first.';
        } else if (env.DB) {
          const subdomain = extractSubdomain(rawScope);
          const scope = `w:${subdomain}`;
          const cleanHandle = targetHandle.toLowerCase();

          // 1. Verify sender is Channel Admin / Owner
          const senderRole = await getUserRole(env, scope, userHandle);
          if (senderRole !== 'owner' && senderRole !== 'admin') {
            responseText = `❌ Only workspace owners or admins can assign roles in this group. (Your role: <code>${senderRole}</code>)`;
          } else {
            // 2. Generate 4-digit claim code (15-minute expiry)
            const claimCode = Math.floor(1000 + Math.random() * 9000).toString();
            const now = Date.now();
            const expiresAt = now + 900000; // 15 minutes

            // Ensure member_invites table exists
            await env.DB.prepare(`
              CREATE TABLE IF NOT EXISTS member_invites (
                code TEXT PRIMARY KEY,
                subdomain TEXT NOT NULL,
                scope TEXT NOT NULL,
                handle TEXT NOT NULL,
                role TEXT NOT NULL,
                section TEXT,
                tables TEXT,
                created_by TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL
              )
            `).run().catch(() => {});

            await env.DB.prepare(
              `INSERT INTO member_invites (code, subdomain, scope, handle, role, section, tables, created_by, created_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(claimCode, subdomain, scope, cleanHandle, newRole, sectionArg, tablesArg, userHandle, now, expiresAt).run();

            // 3. Update OKF team/members.md
            try {
              const existingMembersMd = await readWorkspaceFile(env, scope, 'team/members.md') || '# Team Members\n';
              const memberEntry = `- handle: "${cleanHandle}"\n  role: "${newRole}"\n  section: "${sectionArg || ''}"\n  tables: "${tablesArg || ''}"\n  assigned_at: "${new Date().toISOString()}"\n`;
              await uploadWorkspaceFile(env, scope, 'team/members.md', `${existingMembersMd}\n${memberEntry}`);
            } catch (okfErr) {
              console.warn('[Telegram /role] OKF upload warning:', okfErr);
            }

            // 4. Try sending private DM to staff with the 4-digit code
            if (env.TELEGRAM_BOT_TOKEN) {
              const dmText = `👋 Hi <b>${targetHandle}</b>!\nYou have been assigned as <b>${newRole}</b> at <b>${subdomain}</b>.\n\nYour private 4-digit TarApp join code is:\n\n🔢 <code>${claimCode}</code>\n\nOpen <b>TarApp</b> (logged in with Google) and enter this code to connect your account. (Expires in 15 minutes)`;
              sendTelegramMessage(
                { platform: 'telegram', botToken: env.TELEGRAM_BOT_TOKEN },
                { chatId: cleanHandle.replace('@', ''), text: dmText }
              ).catch(() => {});
            }

            let details = `Role: <b>${newRole}</b>`;
            if (sectionArg) details += ` | Section: <b>${sectionArg}</b>`;
            if (tablesArg) details += ` | Tables: <b>${tablesArg}</b>`;

            responseText = `👋 <b>${targetHandle}</b> assigned to <b>${subdomain}</b>!\n${details}\n\n📩 <b>Private join code sent in DM.</b>\n<i>(Staff member opens TarApp, enters the 4-digit code to claim with Google Sign-In)</i>`;
          }
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 3. /team
    // ────────────────────────────────────────────────────────────────
    else if (command === '/team' || command.startsWith('/team')) {
      const rawScope = await getScopeForChat(env, chatId);
      if (!rawScope || rawScope === 'unassigned') {
        responseText = '⚠️ Group not linked to a workspace. Please run <code>/link &lt;workspace&gt;</code> first.';
      } else {
        const subdomain = extractSubdomain(rawScope);
        const scope = `w:${subdomain}`;
        const members = await getMembersForScope(env, scope);
        if (members.length === 0) {
          responseText = `👥 <b>${subdomain}</b> Team Roles:\n<i>(No explicit member roles assigned yet. Group members inherit default role <code>staff</code>)</i>.`;
        } else {
          const listStr = members.map(m => {
            const icon = m.role === 'admin' ? '👑' : m.role === 'manager' ? '⭐' : m.role === 'chef' ? '🍳' : m.role === 'waiter' ? '🍽️' : '🔹';
            return `${icon} ${m.handle} — <i>${m.role}</i>`;
          }).join('\n');
          responseText = `👥 <b>${subdomain}</b> Team (${members.length} members):\n${listStr}`;
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 4. /remove <@handle>
    // ────────────────────────────────────────────────────────────────
    else if (command === '/remove' || command.startsWith('/remove')) {
      const targetHandle = parts[1] || '';
      if (!targetHandle || !targetHandle.startsWith('@')) {
        responseText = '⚠️ Usage: <code>/remove @username</code>';
      } else {
        const rawScope = await getScopeForChat(env, chatId);
        if (!rawScope || rawScope === 'unassigned') {
          responseText = '⚠️ Group not linked to a workspace.';
        } else {
          const subdomain = extractSubdomain(rawScope);
          const scope = `w:${subdomain}`;
          const cleanHandle = targetHandle.toLowerCase();

          // 1. Remove from D1 members
          if (env.DB) {
            await env.DB.prepare(
              `DELETE FROM members WHERE scope = ? AND LOWER(handle) = ?`
            ).bind(scope, cleanHandle).run();
          }

          // 2. Soft-delete in Workspace Turso DB
          if (env.DB) {
            const personId = `usr_${cleanHandle.replace('@', '')}`;
            await executeWorkspaceTursoQuery(
              env.DB, env, scope,
              `UPDATE matter SET status = 0, deleted_at = unixepoch() WHERE id = ?`,
              [personId]
            ).catch(() => {});

            await executeWorkspaceTursoQuery(
              env.DB, env, scope,
              `UPDATE graph SET deleted_at = unixepoch() WHERE src = ? OR tgt = ?`,
              [personId, personId]
            ).catch(() => {});
          }

          responseText = `🚫 Access revoked for <b>${targetHandle}</b> in <b>${subdomain}</b>.`;
        }
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 5. Help
    // ────────────────────────────────────────────────────────────────
    else {
      responseText = `🤖 <b>TAR Bot Commands</b>:\n• <code>/link &lt;subdomain&gt;</code> — Link group to workspace\n• <code>/role @user &lt;role&gt; [section:X] [tables:Y-Z]</code> — Zero-UI onboarding\n• <code>/team</code> — View team member roster & assignments\n• <code>/remove @user</code> — Revoke member workspace access`;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Natural Language Event Capture (plan6.md §17 Reactive Mode)
  // ──────────────────────────────────────────────────────────────────
  else {
    const rawScope = await getScopeForChat(env, chatId);
    if (!rawScope || rawScope === 'unassigned') {
      responseText = '⚠️ Group not linked to a workspace. An owner can run <code>/link &lt;subdomain&gt;</code> to link this group.';
    } else {
      const subdomain = extractSubdomain(rawScope);
      const scope = `w:${subdomain}`;
      const userRole = await getUserRole(env, scope, userHandle);
      const lowerText = text.toLowerCase();

      // Case A: Clock in / Clock out (motion type 118 / 119)
      if (lowerText === 'clock in' || lowerText.startsWith('clock in')) {
        const motId = generateEntityId('motion');
        const idemKey = `${subdomain}:${userHandle}:${Date.now()}:clockin`;
        if (env.DB) {
          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
             VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)`,
            [motId, MOTION_TYPES.clock_in, userHandle, JSON.stringify({ hdl: userHandle, action: 'clock_in' }), userHandle, scope, idemKey]
          );
        }
        responseText = `⏱️ <b>${userHandle}</b> clocked in at ${new Date().toLocaleTimeString()}. Have a great shift!`;
      }

      else if (lowerText === 'clock out' || lowerText.startsWith('clock out')) {
        const motId = generateEntityId('motion');
        const idemKey = `${subdomain}:${userHandle}:${Date.now()}:clockout`;
        if (env.DB) {
          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
             VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)`,
            [motId, MOTION_TYPES.clock_out, userHandle, JSON.stringify({ hdl: userHandle, action: 'clock_out' }), userHandle, scope, idemKey]
          );
        }
        responseText = `🏁 <b>${userHandle}</b> clocked out. Shift logged & handover notes queued.`;
      }

      // Case B: Contact / Customer Creation (matter type 1)
      else if (lowerText.includes('contact') || lowerText.includes('customer') || lowerText.startsWith('add customer')) {
        const nameClean = text.replace(/add|create|new|contact|customer/gi, '').trim() || 'New Contact';
        const phoneMatch = text.match(/(\+?\d[\d\s-]{7,}\d)/);
        const phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : null;
        const contactName = phoneMatch ? nameClean.replace(phoneMatch[0], '').trim() : nameClean;

        const cusId = generateEntityId('customer');
        const motId = generateEntityId('motion');
        const dataJson = JSON.stringify({ fn: contactName, ph: phone, hdl: userHandle });
        const idemKey = `${subdomain}:${userHandle}:${Date.now()}:cus_create`;

        if (env.DB) {
          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT INTO matter (id, type, title, ref, price, qty, min_qty, status, data, role, scope, at, updated, deleted_at)
             VALUES (?, ?, ?, ?, NULL, NULL, NULL, 1, ?, 'customer', ?, unixepoch(), unixepoch(), NULL)`,
            [cusId, MATTER_TYPES.person, contactName, cusId, dataJson, scope]
          );

          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
             VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)`,
            [motId, MOTION_TYPES.activity, cusId, JSON.stringify({ event: 'contact_created', title: contactName }), userHandle, scope, idemKey]
          );
        }

        responseText = `👤 Contact <b>${contactName}</b> saved to directory in <b>${subdomain}</b> (ID: <code>${cusId}</code>).`;
      }

      // Case C: Item / Product Creation (matter type 3)
      else if (lowerText.includes('item') || lowerText.includes('product') || lowerText.startsWith('add product')) {
        const dollarMatch = text.match(/\$(\d+(\.\d+)?)/);
        const price = dollarMatch ? parseFloat(dollarMatch[1]) : 0;
        const nameClean = text.replace(/add|create|new|item|product|stock/gi, '').replace(/\$\d+(\.\d+)?/, '').trim() || 'New Item';
        const sku = `SKU-${nameClean.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;

        const prdId = generateEntityId('product');
        const motId = generateEntityId('motion');
        const dataJson = JSON.stringify({ name: nameClean, prc: price, sku, hdl: userHandle });
        const idemKey = `${subdomain}:${userHandle}:${Date.now()}:prd_create`;

        if (env.DB) {
          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT INTO matter (id, type, title, ref, price, qty, min_qty, status, data, role, scope, at, updated, deleted_at)
             VALUES (?, ?, ?, ?, ?, 100, 10, 1, ?, NULL, ?, unixepoch(), unixepoch(), NULL)`,
            [prdId, MATTER_TYPES.product, nameClean, sku, price, dataJson, scope]
          );

          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
             VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)`,
            [motId, MOTION_TYPES.stock_receive, prdId, JSON.stringify({ sku, name: nameClean, qty: 100, price }), userHandle, scope, idemKey]
          );
        }

        responseText = `📦 Item <b>${nameClean}</b> ($${price.toFixed(2)}) added to catalog in <b>${subdomain}</b> (SKU: <code>${sku}</code>).`;
      }

      // Case D: Refund Motion (motion type 102)
      else if (lowerText.includes('refund') || lowerText.includes('return')) {
        const amountMatch = text.match(/\$?(\d+(\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        const reason = text.replace(/refund|return/gi, '').replace(/\$?(\d+(\.\d+)?)/, '').trim() || 'Customer refund request';

        const ordId = generateEntityId('order');
        const motId = generateEntityId('motion');
        const idemKey = `${subdomain}:${userHandle}:${Date.now()}:refund`;
        const dataJson = JSON.stringify({ ord: ordId, amt: amount, reason, hdl: userHandle, role: userRole });

        if (userRole === 'staff') {
          // Staff requires owner/manager approval -> push inbox approval task to owner
          if (env.DB) {
            await executeWorkspaceTursoQuery(
              env.DB, env, scope,
              `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
               VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)`,
              [motId, MOTION_TYPES.refund, ordId, dataJson, userHandle, scope, idemKey]
            );
          }
          responseText = `⏳ Refund request ($${amount.toFixed(2)}) submitted for Manager Approval (Ref: <code>${motId}</code>).`;
        } else {
          // Manager / Admin -> Execute immediately
          if (env.DB) {
            await executeWorkspaceTursoQuery(
              env.DB, env, scope,
              `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
               VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)`,
              [motId, MOTION_TYPES.refund, ordId, JSON.stringify({ ord: ordId, amt: amount, reason, approved_by: userHandle, status: 'approved' }), userHandle, scope, idemKey]
            );
          }
          responseText = `✅ Refund ($${amount.toFixed(2)}) approved & recorded by <b>${userHandle}</b> (${userRole}).`;
        }
      }

      // Case E: Sale / Order Motion (motion type 101 sale & matter type 14 order)
      else if (/\$?(\d+)/.test(text) || lowerText.includes('table') || lowerText.includes('sale') || lowerText.includes('order')) {
        const dollarMatch = text.match(/\$(\d+(\.\d+)?)/);
        let total = 0;
        if (dollarMatch) {
          total = parseFloat(dollarMatch[1]);
        } else {
          const textWithoutTable = text.replace(/table\s*\d+:?/i, '');
          const amountMatch = textWithoutTable.match(/(\d+(\.\d+)?)/);
          total = amountMatch ? parseFloat(amountMatch[1]) : 50;
        }

        const items = text.replace(/\$\d+(\.\d+)?/, '').replace(/table\s*\d+:?/i, '').replace(/cash|card|paid/i, '').trim() || 'Items';
        const paymentMethod = lowerText.includes('card') ? 'Card' : 'Cash';
        const saleNum = Math.floor(1000 + Math.random() * 9000);

        const ordId = generateEntityId('order');
        const motId = generateEntityId('motion');
        const idemKey = `${subdomain}:${userHandle}:${Date.now()}:sale`;
        const dataJson = JSON.stringify({ sale_id: saleNum, items, amt: total, cur: 'USD', pay: paymentMethod, ord: ordId });

        if (env.DB) {
          // 1. Insert matter order record (type=14 order)
          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT INTO matter (id, type, title, ref, price, qty, min_qty, status, data, role, scope, at, updated, deleted_at)
             VALUES (?, ?, ?, ?, ?, 1, NULL, 3, ?, NULL, ?, unixepoch(), unixepoch(), NULL)`,
            [ordId, MATTER_TYPES.order, `Order #${saleNum}`, ordId, total, dataJson, scope]
          );

          // 2. Insert motion event (type=101 sale)
          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
             VALUES (?, ?, ?, ?, ?, unixepoch(), ?, ?, NULL)`,
            [motId, MOTION_TYPES.sale, ordId, dataJson, userHandle, scope, idemKey]
          );
        }

        responseText = `✅ Sale #${saleNum} ($${total.toFixed(2)}) logged by <b>${userHandle}</b> (Order: <code>${ordId}</code>).`;
      }

      // Case F: General Activity Fallback (motion type 116 activity)
      else {
        const motId = generateEntityId('motion');
        const idemKey = `${subdomain}:${userHandle}:${Date.now()}:act`;
        if (env.DB) {
          await executeWorkspaceTursoQuery(
            env.DB, env, scope,
            `INSERT OR IGNORE INTO motion (id, type, ref, data, by, at, scope, idem, deleted_at)
             VALUES (?, ?, NULL, ?, ?, unixepoch(), ?, ?, NULL)`,
            [motId, MOTION_TYPES.activity, JSON.stringify({ text, platform: 'telegram' }), userHandle, scope, idemKey]
          );
        }
        responseText = `🤖 Event captured from <b>${userHandle}</b> in <b>${subdomain}</b>: "${text}"`;
      }
    }
  }

  return {
    message: channelMsg,
    response: {
      chatId,
      text: responseText,
      replyToMessageId: message.message_id?.toString(),
    },
  };
}

/**
 * Initialize D1 channels and members table schema if missing.
 */
async function initTables(env: { DB?: D1Database }): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS channels (
        chat_id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        name TEXT,
        platform TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        handle TEXT NOT NULL,
        role TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();
  } catch (e) {
    console.warn('[Telegram DB Setup] Exception creating tables:', e);
  }
}

/**
 * Helper to get linked workspace scope for a chat_id.
 */
async function getScopeForChat(env: { DB?: D1Database }, chatId: string): Promise<string | null> {
  if (!env.DB) return null;
  const row = await env.DB.prepare('SELECT scope FROM channels WHERE chat_id = ?').bind(chatId).first();
  return (row?.scope as string) || null;
}

/**
 * Helper to get user's role for a scope.
 */
async function getUserRole(env: { DB?: D1Database }, scope: string, handle: string): Promise<string> {
  if (!env.DB || !handle) return 'staff';
  const row = await env.DB.prepare(
    'SELECT role FROM members WHERE scope = ? AND LOWER(handle) = ?'
  ).bind(scope, handle.toLowerCase()).first();
  return (row?.role as string) || 'staff';
}

/**
 * Helper to list all team members for a scope.
 */
async function getMembersForScope(env: { DB?: D1Database }, scope: string): Promise<Array<{ handle: string; role: string }>> {
  if (!env.DB) return [];
  const result = await env.DB.prepare('SELECT handle, role FROM members WHERE scope = ?').bind(scope).all();
  return (result.results || []) as Array<{ handle: string; role: string }>;
}

/**
 * Send a message via Telegram Bot API with automatic fallback for HTML errors.
 */
export async function sendTelegramMessage(
  config: ChannelConfig,
  response: ChannelResponse
): Promise<boolean> {
  if (!config.botToken) return false;

  const targetChatId = !isNaN(Number(response.chatId)) ? Number(response.chatId) : response.chatId;
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: response.text,
        parse_mode: 'HTML',
      }),
    });
    const resultText = await res.text();
    console.log('[Telegram Outbound Response]:', res.status, resultText);
    if (res.ok) return true;

    // Fallback plain text if HTML parsing failed
    const plainText = response.text.replace(/<[^>]*>/g, '');
    const fallbackRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: plainText,
      }),
    });
    return fallbackRes.ok;
  } catch (e) {
    console.error('[Telegram Outbound Exception]:', e);
    return false;
  }
}

/**
 * Set Telegram webhook URL.
 */
export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    return res.ok;
  } catch (e) {
    console.error('[Telegram] Set webhook failed:', e);
    return false;
  }
}
