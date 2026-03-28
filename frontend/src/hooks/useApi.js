import { useState, useCallback, useEffect } from 'react';

/**
 * useApi — wraps any async API call with loading / error / data state.
 *
 * Usage (manual trigger):
 *   const { execute, loading, error, data } = useApi(letters.list);
 *   useEffect(() => execute({ status: 'submitted' }), []);
 *
 * Usage (auto-fetch on mount):
 *   const { loading, error, data } = useApi(admin.stats, { autoFetch: true });
 */
export function useApi(apiFn, options = {}) {
  const [loading, setLoading] = useState(options.autoFetch ? true : false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(options.initialData || null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      // Backend always wraps in { success, data, meta }
      const result = res.data !== undefined ? res.data : res;
      setData(result);
      return { success: true, data: result, meta: res.meta };
    } catch (err) {
      setError(err.message || 'An error occurred');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  // Auto-fetch on mount if requested
  useEffect(() => {
    if (options.autoFetch) {
      execute(...(options.args || []));
    }
  }, []); // eslint-disable-line

  return { loading, error, data, execute, setData };
}

/**
 * useSubmit — for form submissions that show success/error inline.
 */
export function useSubmit(apiFn) {
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [success,   setSuccess]   = useState(false);
  const [resultData, setResultData] = useState(null);

  const submit = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await apiFn(...args);
      const result = res.data !== undefined ? res.data : res;
      setResultData(result);
      setSuccess(true);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message || 'Submission failed');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  const reset = () => { setError(null); setSuccess(false); setResultData(null); };

  return { loading, error, success, resultData, submit, reset };
}
