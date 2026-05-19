import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../utils/error';

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (err) {
      setError(errorMessage(err, 'เกิดข้อผิดพลาด'));
    } finally {
      setLoading(false);
    }
    // Callers pass the same dependency list they would give to useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, reload: run };
}
