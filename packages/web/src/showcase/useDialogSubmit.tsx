import { useEffect, useRef, useState } from 'react';

/** The initiating dialog owns save errors; parents must let rejected saves propagate. */
export function useDialogSubmit() {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const submit = async (operation: () => Promise<void>) => {
    if (pending.current) return false;
    pending.current = true;
    setError('');
    setSaving(true);
    try {
      await operation();
      return true;
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : '保存失败，请稍后重试');
      return false;
    } finally {
      pending.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  return { error, saving, submit };
}

/** Render inside the dialog, before the fields; never in a global toast/page banner. */
export function DialogSubmitError({ error }: { error: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) ref.current?.focus(); }, [error]);
  return error ? <div ref={ref} className="enterprise-alert span-2" role="alert" tabIndex={-1} style={{ whiteSpace: 'pre-line' }}>{error}</div> : null;
}
