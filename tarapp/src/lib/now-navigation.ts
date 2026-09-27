let pendingSource: string | null = null;

export function requestNowReload(source: string) { pendingSource = source; }
export function takeNowReload() { const source = pendingSource; pendingSource = null; return source; }
