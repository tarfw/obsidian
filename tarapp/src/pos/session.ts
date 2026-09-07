import type { CartLine, PosOverview, PosRecord } from './types';

/**
 * A POS screen is a full-screen flow and is deliberately unmounted on exit.
 * Keep its safe, workspace-local view state here so reopening it feels instant.
 * The server remains the source of truth and refreshes this data in background.
 */
export interface PosSession {
  overview?: PosOverview;
  products?: PosRecord[];
  cart: CartLine[];
  discount: string;
  customer: PosRecord | null;
}

const sessions = new Map<string, PosSession>();

export const getPosSession = (scope: string) => sessions.get(scope);

export const savePosSession = (scope: string, session: PosSession) => {
  sessions.set(scope, session);
};

export const clearPosProductSession = (scope: string) => {
  const current = sessions.get(scope);
  if (current) sessions.set(scope, { ...current, products: undefined });
};
