import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

const SECURE_STORE_AGENT_NAME_KEY = 'tar_agent_name';
export const DEFAULT_AGENT_NAME = 'TAR';

let cachedAgentName = DEFAULT_AGENT_NAME;
let isLoaded = false;
const listeners = new Set<(name: string) => void>();

export async function getAgentName(): Promise<string> {
  if (isLoaded) return cachedAgentName;
  try {
    const saved = await SecureStore.getItemAsync(SECURE_STORE_AGENT_NAME_KEY);
    if (saved && saved.trim()) {
      cachedAgentName = saved.trim();
    }
  } catch {
    // Retain default if storage unavailable
  }
  isLoaded = true;
  return cachedAgentName;
}

export function getCachedAgentName(): string {
  return cachedAgentName;
}

export async function setAgentName(name: string): Promise<string> {
  const clean = name.trim() || DEFAULT_AGENT_NAME;
  cachedAgentName = clean;
  isLoaded = true;
  try {
    await SecureStore.setItemAsync(SECURE_STORE_AGENT_NAME_KEY, clean);
  } catch {
    // Ignore storage write issues
  }
  listeners.forEach((listener) => listener(clean));
  return clean;
}

export function useAgentName(): string {
  const [name, setName] = useState<string>(cachedAgentName);

  useEffect(() => {
    void getAgentName().then((loadedName) => setName(loadedName));
    const listener = (updated: string) => setName(updated);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return name;
}
