import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getValidIdToken } from '@/lib/auth';

export default function Index() {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getValidIdToken()
      .then((token) => { if (active) setTarget(token ? '/(tabs)/canvas' : '/auth'); })
      .catch(() => { if (active) setTarget('/auth'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (target) {
      router.replace(target as any);
    }
  }, [target, router]);

  return null;
}
