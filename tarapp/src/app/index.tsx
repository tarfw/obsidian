import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '@/lib/auth';
import { tar } from '@/lib/tar';

export default function Index() {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then(async (user) => {
      if (!user) {
        setTarget('/auth');
        return;
      }
      setTarget('/(tabs)/workspaces');
    });
  }, []);

  useEffect(() => {
    if (target) {
      router.replace(target as any);
    }
  }, [target, router]);

  return null;
}
