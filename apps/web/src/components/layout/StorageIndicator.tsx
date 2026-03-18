import { useEffect, useState } from 'react';

/**
 * Shows estimated IndexedDB storage usage via the StorageManager API.
 */
export function StorageIndicator() {
  const [usage, setUsage] = useState<string | null>(null);

  useEffect(() => {
    async function estimate() {
      if (!navigator.storage?.estimate) return;
      const { usage: bytes, quota } = await navigator.storage.estimate();
      if (bytes === undefined || quota === undefined) return;

      const usedMB = (bytes / 1024 / 1024).toFixed(1);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      setUsage(`${usedMB} / ${quotaMB} MB`);
    }

    estimate();
    const interval = setInterval(estimate, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!usage) return null;

  return <span className="text-xs text-zinc-500" title="IndexedDB storage usage">{usage}</span>;
}
