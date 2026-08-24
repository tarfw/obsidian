import { describe, it, expect, beforeEach } from 'vitest';
import { SiteCompiler, SiteModule } from '../src/modules/site.ts';
import { extractFactSlice, computeRenderKey } from '../src/domain/facts.ts';
import { R2StorageService } from '../src/data/r2.ts';
import { KVCacheService } from '../src/data/kv.ts';

describe('Site Module Compiler, Sanitizer & Publishing', () => {
  let r2: R2StorageService;
  let kv: KVCacheService;
  let siteModule: SiteModule;

  beforeEach(() => {
    r2 = new R2StorageService();
    kv = new KVCacheService();
    siteModule = new SiteModule(r2, kv);
  });

  it('correctly slices facts and computes composite render keys', async () => {
    const allFacts = {
      'offerings.item1': 'Espresso ($3.50)',
      'logistics.address': '123 Market St',
      'faq.q1': 'Do you offer catering?',
    };

    const slice = extractFactSlice(allFacts, 'offerings');
    expect(slice.facts['offerings.item1']).toBe('Espresso ($3.50)');
    expect(slice.facts['logistics.address']).toBeUndefined();

    const renderKey = await computeRenderKey({
      styleHash: 'hash_style_1',
      sectionBriefHash: 'hash_brief_1',
      factSliceHash: 'hash_slice_1',
      compilerVersion: '1.0.0',
      promptVersion: '1.0.0',
    });

    expect(renderKey.length).toBe(64); // SHA-256 hex string
  });

  it('sanitizes and rejects unsafe scripts and event handlers', () => {
    const maliciousHtml = `
      <div>
        <h1>Welcome</h1>
        <script>alert('pwned')</script>
        <button onclick="stealCookies()">Click me</button>
        <a href="javascript:doEvil()">Bad link</a>
        <img src="pic.jpg">
      </div>
    `;

    const result = SiteCompiler.verifyAndSanitize(maliciousHtml);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('<script>'))).toBe(true);
    expect(result.violations.some((v) => v.includes('Inline event handlers'))).toBe(true);
    expect(result.violations.some((v) => v.includes('Dangerous URI scheme'))).toBe(true);
    expect(result.violations.some((v) => v.includes('alt attribute'))).toBe(true);

    expect(result.sanitizedHtml).not.toContain('<script>');
    expect(result.sanitizedHtml).not.toContain('onclick=');
  });

  it('publishes immutable R2 versions and promotes to KV cache', async () => {
    const safeHtml = '<!DOCTYPE html><html><body><h1>Coffee Shop</h1></body></html>';
    const publishRes = await siteModule.publish('ws_test', safeHtml, 'render_key_123');

    expect(publishRes.success).toBe(true);
    expect(publishRes.versionId).toContain('v_');

    // Verify KV cache was populated
    const cached = await kv.get('site_live_ws_test');
    expect(cached).toBe(safeHtml);

    // Verify live pointer in R2
    const livePointer = await r2.readText('workspaces/ws_test/site/live.json');
    expect(livePointer).toContain(publishRes.versionId);
  });

  it('supports version rollback safely', async () => {
    // 1. Publish version 1
    const htmlV1 = '<html><body>Version 1</body></html>';
    const v1Res = await siteModule.publish('ws_test', htmlV1, 'key_1');

    // 2. Publish version 2
    const htmlV2 = '<html><body>Version 2</body></html>';
    const v2Res = await siteModule.publish('ws_test', htmlV2, 'key_2');

    expect(await kv.get('site_live_ws_test')).toBe(htmlV2);

    // 3. Rollback to version 1
    const rollbackRes = await siteModule.rollback('ws_test');
    expect(rollbackRes.success).toBe(true);
    expect(rollbackRes.activeVersion).toBe(v1Res.versionId);
    expect(await kv.get('site_live_ws_test')).toBe(htmlV1);
  });
});
