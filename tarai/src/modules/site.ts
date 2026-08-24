/**
 * Tier 2: Site Agent Module
 * Location: tarai/src/modules/site.ts
 * Identity: job_id + scope
 * Mission: Plan, generate, verify, and publish a business site.
 * Rule: Deterministic compilers plus bounded LLM work. Never receives write credentials for canonical business truth.
 */
import { computeFactSliceHash, computeRenderKey, type FactSlice } from '../domain/facts.ts';
import { computeSha256 } from '../domain/idempotency.ts';
import type { R2StorageService } from '../data/r2.ts';
import type { KVCacheService } from '../data/kv.ts';

export interface SitePlan {
  siteTitle: string;
  theme: {
    primaryColor: string;
    fontFamily: string;
  };
  sections: Array<{
    id: string;
    kind: 'hero' | 'features' | 'products' | 'contact' | 'faq';
    title: string;
    factSliceCategory: FactSlice['category'];
  }>;
}

export interface VerificationResult {
  passed: boolean;
  violations: string[];
  sanitizedHtml?: string;
  cspHeaders?: Record<string, string>;
}

export interface PublishResult {
  success: boolean;
  versionId: string;
  publishedUrl: string;
  rollbackPointer: string;
  renderedKey: string;
  error?: string;
}

export class SiteCompiler {
  /**
   * Deterministic HTML sanitizer & security verification
   * Rejects scripts, inline event handlers (onclick, onload, etc.), remote JS, and unsafe protocols
   */
  static verifyAndSanitize(html: string): VerificationResult {
    const violations: string[] = [];

    // 1. Script tag check
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(html) || /<script/i.test(html)) {
      violations.push('Security violation: Executable <script> tags are strictly forbidden');
    }

    // 2. Inline event handler check (e.g. onclick=, onerror=, onload=)
    if (/\son[a-zA-Z]+\s*=/i.test(html)) {
      violations.push('Security violation: Inline event handlers (on* attributes) are strictly forbidden');
    }

    // 3. Javascript: and VBScript: URI schemes
    if (/href\s*=\s*["']\s*(?:javascript|data|vbscript):/i.test(html) || /src\s*=\s*["']\s*(?:javascript|data|vbscript):/i.test(html)) {
      violations.push('Security violation: Dangerous URI scheme (javascript:, data:, vbscript:)');
    }

    // 4. Accessibility check: images must have alt attributes
    const imgWithoutAlt = /<img(?![^>]*\balt=)[^>]*>/i;
    if (imgWithoutAlt.test(html)) {
      violations.push('Accessibility warning: <img> tags must include an alt attribute');
    }

    // 5. Clean / sanitize HTML
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son[a-zA-Z]+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\son[a-zA-Z]+\s*=\s*[^ >]+/gi, '');

    const cspHeaders = {
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; script-src 'none';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    };

    return {
      passed: violations.filter((v) => v.startsWith('Security violation')).length === 0,
      violations,
      sanitizedHtml: sanitized,
      cspHeaders,
    };
  }

  /**
   * Deterministic Site Synthesis from Fact Slices and Plan
   */
  static synthesizeSiteHtml(plan: SitePlan, slices: FactSlice[]): string {
    const sectionHtmls = plan.sections.map((sec) => {
      const slice = slices.find((s) => s.category === sec.factSliceCategory);
      const factsText = slice ? JSON.stringify(slice.facts, null, 2) : '';

      return `
      <section id="${sec.id}" class="site-section site-section-${sec.kind}">
        <div class="section-container">
          <h2>${sec.title}</h2>
          <div class="section-content">
            <p class="section-description">Welcome to our ${sec.title}.</p>
            ${factsText ? `<pre class="facts-data" style="display:none;">${factsText}</pre>` : ''}
          </div>
        </div>
      </section>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${plan.siteTitle}</title>
  <style>
    :root {
      --primary: ${plan.theme.primaryColor};
      --font: ${plan.theme.fontFamily};
    }
    body {
      font-family: var(--font), sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
    }
    header {
      background: var(--primary);
      color: white;
      padding: 1.5rem;
      text-align: center;
    }
    .section-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    footer {
      background: #f4f4f4;
      text-align: center;
      padding: 1rem;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <header>
    <h1>${plan.siteTitle}</h1>
  </header>
  <main>
    ${sectionHtmls.join('\n')}
  </main>
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${plan.siteTitle}. All rights reserved.</p>
  </footer>
</body>
</html>`;
  }
}

export class SiteModule {
  constructor(
    private r2: R2StorageService,
    private kv: KVCacheService
  ) {}

  async planAndDraft(
    workspaceId: string,
    jobId: string,
    siteTitle: string,
    slices: FactSlice[]
  ): Promise<{ plan: SitePlan; draftHtml: string; renderKey: string }> {
    const plan: SitePlan = {
      siteTitle,
      theme: {
        primaryColor: '#1e293b',
        fontFamily: 'Inter, system-ui',
      },
      sections: [
        { id: 'sec-hero', kind: 'hero', title: 'Welcome', factSliceCategory: 'branding' },
        { id: 'sec-products', kind: 'products', title: 'Our Offerings', factSliceCategory: 'offerings' },
        { id: 'sec-faq', kind: 'faq', title: 'Frequently Asked Questions', factSliceCategory: 'faq' },
        { id: 'sec-contact', kind: 'contact', title: 'Contact Us', factSliceCategory: 'logistics' },
      ],
    };

    const draftHtml = SiteCompiler.synthesizeSiteHtml(plan, slices);

    // Compute composite render key
    const styleHash = await computeSha256(JSON.stringify(plan.theme));
    const sectionBriefHash = await computeSha256(JSON.stringify(plan.sections));
    const factSliceHash = await computeSha256(JSON.stringify(slices));

    const renderKey = await computeRenderKey({
      styleHash,
      sectionBriefHash,
      factSliceHash,
      compilerVersion: '1.0.0',
      promptVersion: '1.0.0',
    });

    // Save draft to R2
    const draftPath = `workspaces/${workspaceId}/site/drafts/${jobId}.html`;
    await this.r2.writeText(draftPath, draftHtml, { renderKey });

    return { plan, draftHtml, renderKey };
  }

  async publish(
    workspaceId: string,
    draftHtml: string,
    renderKey: string
  ): Promise<PublishResult> {
    // 1. Deterministic verification
    const verification = SiteCompiler.verifyAndSanitize(draftHtml);
    if (!verification.passed) {
      return {
        success: false,
        versionId: '',
        publishedUrl: '',
        rollbackPointer: '',
        renderedKey: renderKey,
        error: `Site publish verification failed: ${verification.violations.join('; ')}`,
      };
    }

    const sanitizedHtml = verification.sanitizedHtml || draftHtml;
    const versionId = `v_${Date.now()}_${renderKey.slice(0, 8)}`;
    const versionPath = `workspaces/${workspaceId}/site/versions/${versionId}.html`;
    const livePointerPath = `workspaces/${workspaceId}/site/live.json`;

    // 2. Save immutable version in R2
    await this.r2.writeText(versionPath, sanitizedHtml, {
      versionId,
      renderKey,
      publishedAt: new Date().toISOString(),
    });

    // Read previous live version for rollback pointer
    const currentLiveJson = await this.r2.readText(livePointerPath);
    let rollbackPointer = '';
    if (currentLiveJson) {
      try {
        const parsed = JSON.parse(currentLiveJson);
        rollbackPointer = parsed.currentVersionId || '';
      } catch {
        // First publish
      }
    }

    // 3. Update live pointer in R2
    await this.r2.writeText(
      livePointerPath,
      JSON.stringify({
        currentVersionId: versionId,
        rollbackVersionId: rollbackPointer,
        updatedAt: new Date().toISOString(),
      })
    );

    // 4. Promote to KV Edge Serving Cache
    const kvKey = `site_live_${workspaceId}`;
    await this.kv.set(kvKey, sanitizedHtml, 3600); // 1 hour TTL cache

    return {
      success: true,
      versionId,
      publishedUrl: `/sites/${workspaceId}`,
      rollbackPointer,
      renderedKey: renderKey,
    };
  }

  async rollback(workspaceId: string): Promise<{ success: boolean; activeVersion?: string; error?: string }> {
    const livePointerPath = `workspaces/${workspaceId}/site/live.json`;
    const currentLiveJson = await this.r2.readText(livePointerPath);
    if (!currentLiveJson) {
      return { success: false, error: 'No live site found to rollback' };
    }

    const parsed = JSON.parse(currentLiveJson);
    const rollbackVersion = parsed.rollbackVersionId;
    if (!rollbackVersion) {
      return { success: false, error: 'No previous rollback version exists' };
    }

    const versionPath = `workspaces/${workspaceId}/site/versions/${rollbackVersion}.html`;
    const rollbackHtml = await this.r2.readText(versionPath);
    if (!rollbackHtml) {
      return { success: false, error: `Rollback version artifact ${rollbackVersion} missing in R2` };
    }

    // Update live pointer and KV
    await this.r2.writeText(
      livePointerPath,
      JSON.stringify({
        currentVersionId: rollbackVersion,
        rollbackVersionId: parsed.currentVersionId,
        updatedAt: new Date().toISOString(),
      })
    );

    const kvKey = `site_live_${workspaceId}`;
    await this.kv.set(kvKey, rollbackHtml, 3600);

    return { success: true, activeVersion: rollbackVersion };
  }
}
