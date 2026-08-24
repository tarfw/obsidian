/**
 * Web & TarApp Client Channel Adapter
 */
import type { Client } from '@libsql/client';
import type { AuthContext } from '../domain/types.ts';
import { TarRouter, type RouterRequest, type RouterResponse } from '../modules/router.ts';
import { validateCanvas, createDefaultCanvas } from '../genui/canvas.ts';
import { R2StorageService } from '../data/r2.ts';
import { projectCanvasMarkdown } from '../data/okf-projection.ts';

export class WebChannelAdapter {
  private router = new TarRouter();

  constructor(
    private client: Client,
    private r2: R2StorageService
  ) {}

  async handleIntent(
    req: RouterRequest,
    auth: AuthContext
  ): Promise<RouterResponse> {
    return this.router.handleRequest(req, auth, this.client);
  }

  async getCanvas(workspaceId: string, role: string): Promise<Record<string, unknown>> {
    const canvasPath = `workspaces/${workspaceId}/team/canvas.md`;
    const storedCanvas = await this.r2.readText(canvasPath);

    if (!storedCanvas) {
      const defaultCanvas = createDefaultCanvas(role);
      const okf = projectCanvasMarkdown(
        defaultCanvas.glanceBar.mode,
        defaultCanvas.glanceBar.notice,
        defaultCanvas.liveActionStream
      );
      await this.r2.writeText(canvasPath, okf);
      return defaultCanvas as unknown as Record<string, unknown>;
    }

    // Default structure fallback
    return createDefaultCanvas(role) as unknown as Record<string, unknown>;
  }

  async updateCanvas(
    workspaceId: string,
    rawCanvas: unknown
  ): Promise<{ success: boolean; error?: string }> {
    const validation = validateCanvas(rawCanvas);
    if (!validation.valid || !validation.ast) {
      return { success: false, error: validation.error };
    }

    const okf = projectCanvasMarkdown(
      validation.ast.glanceBar.mode,
      validation.ast.glanceBar.notice,
      validation.ast.liveActionStream
    );

    const canvasPath = `workspaces/${workspaceId}/team/canvas.md`;
    await this.r2.writeText(canvasPath, okf);

    return { success: true };
  }
}
