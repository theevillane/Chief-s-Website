import { useEffect, useState } from 'react';

let toastsStore = [];
const listeners = new Set();

const emit = () => {
  listeners.forEach((fn) => fn([...toastsStore]));
};

const removeToast = (id) => {
  toastsStore = toastsStore.filter((t) => t.id !== id);
  emit();
};

const dismissToast = (id) => {
  toastsStore = toastsStore.map((t) => t.id === id ? { ...t, visible: false } : t);
  emit();
  window.setTimeout(() => removeToast(id), 300);
};

const pushToast = (type, message) => {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  toastsStore = [...toastsStore, { id, type, message, visible: true }];
  if (toastsStore.length > 3) {
    const oldest = toastsStore[0];
    if (oldest) dismissToast(oldest.id);
  }
  emit();
  window.setTimeout(() => dismissToast(id), 4000);
};

export const toast = {
  success: (msg) => pushToast('success', msg),
  error: (msg) => pushToast('error', msg),
  info: (msg) => pushToast('info', msg),
  warning: (msg) => pushToast('warning', msg),
};

export default function ToastContainer() {
  const [items, setItems] = useState(toastsStore);

  useEffect(() => {
    const onChange = (next) => setItems(next);
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, []);

  const colorMap = {
    success: 'var(--forest)',
    error: 'var(--red)',
    info: 'var(--blue)',
    warning: 'var(--amber)',
  };
  const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column-reverse', gap: 10 }}>
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            background: 'white',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            padding: '12px 16px',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            minWidth: 280,
            maxWidth: 360,
            borderLeft: `4px solid ${colorMap[t.type] || 'var(--blue)'}`,
            opacity: t.visible ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
        >
          <span>{iconMap[t.type] || 'ℹ️'}</span>
          <div style={{ fontSize: 14, color: 'var(--ink-mid)', flex: 1 }}>{t.message}</div>
          <button
            onClick={() => dismissToast(t.id)}
            style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

