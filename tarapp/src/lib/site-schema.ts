/** Site v2 document types shared with the harness. The harness validates every field. */

export const DOCUMENT_VERSION = '2.0.0';

export interface DesignDecision { area: string; question: string; choice: string; alternatives?: string[]; note?: string }
export interface DesignSource { reference: string; hash: string; revision: number; decisions: DesignDecision[] }
export interface Design {
  theme: string;
  direction: { audience: string; purpose: string; voice: string; density: string; idea: string };
  color: Record<string, string>;
  type: { display: string; heading: string; body: string; base: number; scale: number; leading: number; weight: number };
  space: { unit: number; section: number; container: number };
  shape: { sm: number; md: number; lg: number; pill: number };
  elevation: { low: number; high: number };
  layout: { columns: number; gap: number; align: string };
  motion: { duration: number; easing: string; reduce: boolean };
  guidance: string[];
  source?: DesignSource;
}

export interface AssetRights { source: string; license: string; approved: boolean; note?: string }
export interface Asset {
  id: string; kind: 'image' | 'video' | 'font' | 'icon'; mime: string; bytes: number; hash: string;
  width?: number; height?: number; alt?: string; rights: AssetRights; generated?: boolean; prompt?: string;
}
export interface AssetSummary extends Asset { used: boolean; url: string }

export interface StyleSet { base?: Record<string, unknown>; small?: Record<string, unknown>; medium?: Record<string, unknown>; large?: Record<string, unknown> }
export interface Node { id: string; kind: string; props: Record<string, unknown>; style?: StyleSet; children?: Node[]; component?: string; variant?: string }
export interface Section { id: string; purpose: string; layout: { kind: string; columns?: number }; style?: StyleSet; nodes: Node[]; bindings?: Record<string, unknown>[] }
export interface Page { id: string; path: string; title: string; meta?: { description?: string }; sections: Section[] }
export interface Journey { id: string; title: string; kind: string; target: string; enabled: boolean; fields: { key: string; label: string; kind: string; required?: boolean }[] }
export interface ReleaseFile { path: string; mime: string; bytes: number; hash: string; key: string }
export interface ReleaseManifest {
  id: string; siteId: string; version: number; generation: number; created: number; hash: string;
  files: ReleaseFile[]; host?: string; epoch?: number; compiler?: string; checks?: { blocking: number; advisory: number };
}
export interface Lock { target: string; kind: 'section' | 'node' | 'token' | 'component' | 'brand'; at: number }
export interface Claim { text: string; verdict: 'supported' | 'contradicted' | 'unsupported'; evidence?: string[] }

export interface SiteDocument {
  schema: typeof DOCUMENT_VERSION;
  revision: number;
  brief: { goal: string; audience: string; tone: string };
  locale: string; timezone: string; currency: string;
  design: Design;
  assets: Asset[];
  components: { id: string; name: string; slots: string[]; variants: Record<string, unknown>; nodes: Node[] }[];
  pages: Page[];
  journeys: Journey[];
  redirects: { from: string; to: string; status: number }[];
  locks: Lock[];
  policy: { publicEnquiry?: boolean; publicOrdering?: boolean; allowedCurrencies?: string[]; turnstile?: string };
  claims?: Claim[];
  currentRelease?: string | null;
  releases?: ReleaseManifest[];
}

export type PatchOperation =
  | { op: 'set_text'; target: string; value: string }
  | { op: 'set_props'; target: string; value: Record<string, unknown> }
  | { op: 'set_style'; target: string; value: StyleSet | null }
  | { op: 'remove_node'; target: string }
  | { op: 'remove_section'; target: string }
  | { op: 'set_token'; token: string; value: string | number }
  | { op: 'set_journey'; journey: Journey }
  | { op: 'set_redirect'; from: string; to: string | null }
  | { op: 'set_page'; page: string; value: { title?: string; description?: string; path?: string } }
  | { op: 'set_brief'; value: Partial<SiteDocument['brief']> }
  | { op: 'set_policy'; value: Partial<SiteDocument['policy']> }
  | { op: 'set_asset_rights'; target: string; value: { approved?: boolean; license?: string; source?: string; alt?: string } }
  | { op: 'add_asset'; asset: Asset }
  | { op: 'remove_asset'; target: string }
  | { op: 'lock'; target: string; kind: Lock['kind'] }
  | { op: 'unlock'; target: string };

export interface DiffEntry { target: string; kind: string; from: string; to: string }
export interface CheckIssue { level: 'blocking' | 'advisory'; area: string; path: string; message: string }
export interface Checks { blocking: CheckIssue[]; advisory: CheckIssue[]; measured: Record<string, number>; claims?: number }
export interface HistoryEntry { revision: number; at: number; summary: string }

export interface AskOutcome {
  siteId: string; base: number; target: string | null; targetKind: 'section' | 'node' | null;
  operations: PatchOperation[]; summary: string; questions: string[];
}
export interface EditOutcome { siteId: string; version: number; revision: number; site: SiteDocument; diff: DiffEntry[] }
export interface SiteSnapshot {
  site: { id: string; version: number; state: string; data: SiteDocument } | null;
  schema: string | null;
  history: HistoryEntry[];
  designMarkdown: string | null;
  publicUrl: string | null;
  liveRelease: string | null;
  publicationState: string | null;
}

export const PREVIEW_FRAMES = [
  { key: 'phone', label: 'Phone', width: 360 },
  { key: 'tablet', label: 'Tablet', width: 768 },
  { key: 'desktop', label: 'Desktop', width: 1440 },
] as const;
