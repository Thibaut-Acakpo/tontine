import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const Msg = ({ kind = 'err', children }) => (children ? <div className={`msg ${kind}`} role={kind === 'err' ? 'alert' : 'status'}>{children}</div> : null);

// ✅ Badge traduit via i18n
export const Badge = ({ v }) => {
  const { t } = useTranslation();
  const translated = t(`status.${v}`);
  const display = translated.startsWith('status.') ? v : translated;
  return <span className={`badge b-${v}`}>{display}</span>;
};

export function Pager({ meta, onPage }) {
  const { t } = useTranslation();
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="pager">
      <button className="btn ghost" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        {t('common.previous')}
      </button>
      <span>{t('common.page')} {meta.page} / {meta.pages}</span>
      <button className="btn ghost" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>
        {t('common.next')}
      </button>
    </div>
  );
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const run = async (fn, okMsg) => {
    setBusy(true); setError(''); setInfo('');
    try {
      const r = await fn();
      if (okMsg) setInfo(okMsg);
      return r;
    } catch (e) {
      setError(e.details?.length ? `${e.message} : ${e.details.map((d) => d.message).join(', ')}` : e.message);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, info, run, setError, setInfo };
}

export const Empty = ({ children }) => <p className="empty">{children}</p>;

// ============================================================
// SKELETON LOADERS
// ============================================================

export function Skeleton({ width = '100%', height = '1rem', radius = 8, className = '', style = {} }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ display: 'inline-block', width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, width = '100%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : width} height=".9rem" />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card stat" style={{ padding: '1.2rem 1.3rem' }}>
      <Skeleton width="60px" height="1.8rem" radius={8} />
      <div style={{ marginTop: '.5rem' }}>
        <Skeleton width="80%" height=".85rem" />
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 2 }) {
  return (
    <div className="card">
      <Skeleton width="55%" height="1.3rem" radius={8} />
      <div style={{ marginTop: '.7rem' }}>
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="scroll">
      <table style={{ minWidth: 400 }}>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton width="60%" height=".75rem" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton width={c === 0 ? '40%' : '70%'} height=".85rem" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '.7rem .3rem', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.8rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Skeleton width="65%" height=".95rem" />
              <div style={{ marginTop: '.35rem' }}>
                <Skeleton width="40%" height=".75rem" />
              </div>
            </div>
            <Skeleton width="70px" height="1rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

let toastId = 0;
const toastListeners = new Set();

export function toast(message, kind = 'info', duration = 3500) {
  const id = ++toastId;
  toastListeners.forEach((fn) => fn({ id, message, kind, duration }));
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.duration);
    };
    toastListeners.add(handler);
    return () => toastListeners.delete(handler);
  }, []);

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span>{t.kind === 'success' ? '✅' : t.kind === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{t.message}</span>
          <button
            className="toast-close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MODAL DE CONFIRMATION
// ============================================================

export function ConfirmModal({
  open,
  title = 'Confirmer',
  message = 'Êtes-vous sûr ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="mut">{message}</p>
        <div className="row between mt" style={{ gap: '.6rem' }}>
          <button className="btn ghost" onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${danger ? 'danger' : ''}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL GÉNÉRIQUE (nouveau)
// ============================================================

export function Modal({ open, title, onClose, children, width = 480 }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: width }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}