import { ReactNode, useMemo, useState, useEffect, createContext, useContext } from 'react';
import { AppState } from 'react-native';
import { getUserDb, subscribeDb, syncPull } from '@/lib/db';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Database } from '@tursodatabase/sync-react-native';

const queryClient = new QueryClient();
const DbContext = createContext<Database | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => getUserDb());

  useEffect(() => {
    // Whenever dbConnections changes or switchUser/initUserSync updates, update the state
    const unsubscribe = subscribeDb(() => {
      setDb(getUserDb());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isActive = AppState.currentState === 'active';
    const synchronize = () => {
      if (isActive) void syncPull();
    };

    synchronize();
    const subscription = AppState.addEventListener('change', (nextState) => {
      isActive = nextState === 'active';
      synchronize();
    });
    const interval = setInterval(synchronize, 30_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DbContext.Provider value={db}>
        {children}
      </DbContext.Provider>
    </QueryClientProvider>
  );
}

interface CompatDb {
  getAllAsync<T = any>(query: string, ...params: any[]): Promise<T[]>;
  getFirstAsync<T = any>(query: string, ...params: any[]): Promise<T | null>;
  runAsync(query: string, ...params: any[]): Promise<void>;
}

export function useDb(): CompatDb {
  const db = useContext(DbContext) || getUserDb();
  return useMemo(() => ({
    async getAllAsync<T = any>(query: string, ...params: any[]): Promise<T[]> {
      try {
        const result = await db.all(query, params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
        return result as T[];
      } catch (e) {
        console.warn('[DB] getAllAsync error:', e);
        return [];
      }
    },
    async getFirstAsync<T = any>(query: string, ...params: any[]): Promise<T | null> {
      try {
        const result = await db.all(query, params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
        return (result?.[0] as T) || null;
      } catch (e) {
        console.warn('[DB] getFirstAsync error:', e);
        return null;
      }
    },
    async runAsync(query: string, ...params: any[]): Promise<void> {
      try {
        await db.run(query, params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
      } catch (e) {
        console.warn('[DB] runAsync error:', e);
      }
    },
  }), [db]);
}
