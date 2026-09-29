import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, money, fdate, fdatetime, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Tilt } from '../components/Fx.jsx';
import { Badge, Empty, Msg, Pager, useAction, toast, ConfirmModal } from '../components/ui.jsx';
import { Icons } from '../components/Icons.jsx';

// ✅ Avatar à initiales
function Avatar({ name, size = 80 }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, hsl(${hue}, 70%, 45%), hsl(${(hue + 40) % 360}, 70%, 30%))`,
      display: 'grid', placeItems: 'center',
      fontWeight: 800, fontSize: size * 0.38, color: '#fff',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,.6)',
      flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
}

// ============================================================
// PAIEMENTS
// ============================================================
export function Payments() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [due, setDue] = useState(null);

  useEffect(() => {
    api('/contributions/mine/summary')
      .then((r) => setSummary(r.data))
      .catch(() => setSummary({ stats: {}, recent: [] }));
    api('/contributions/mine')
      .then((r) => setDue(r.data))
      .catch(() => setDue([]));
  }, []);

  const loading = summary === null || due === null;

  return (
    <>
      <h1>{t('menu.payments')}</h1>
      <p className="mut">{t('payments.subtitle')}</p>

      {/* Statistiques */}
      <div className="grid g4 mt">
        {loading ? (
          <>
            <div className="skeleton" style={{ height: 100, borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 100, borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 100, borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 100, borderRadius: 18 }} />
          </>
        ) : (
          <>
            <Tilt className="stat">
              <b>{money(summary.stats.totalPaid || 0, 'XOF')}</b>
              <span>{t('payments.totalPaid')}</span>
            </Tilt>
            <Tilt className="stat">
              <b>{summary.stats.paymentsCount || 0}</b>
              <span>{t('payments.paymentsCount')}</span>
            </Tilt>
            <Tilt className="stat">
              <b>{summary.stats.pendingCount || 0}</b>
              <span>{t('payments.pendingCount')}</span>
            </Tilt>
            <Tilt className="stat">
              <b>{summary.stats.activeTontinesCount || 0}</b>
              <span>{t('payments.activeTontines')}</span>
            </Tilt>
          </>
        )}
      </div>

      {/* À payer */}
      <div className="card mt">
        <h3>💸 {t('payments.toPay')}</h3>
        {due === null ? (
          <p className="mut sm mt">{t('common.loading')}</p>
        ) : due.length === 0 ? (
          <Empty>{t('dashboard.noPending')}</Empty>
        ) : (
          <div className="dash-list">
            {due.map((c) => (
              <Link key={c.id} to={`/app/tontines/${c.tontineId}`} className="dash-item">
                <div className="dash-item-main">
                  <div className="dash-item-title">
                    {c.tontineName} · {t('dashboard.tour', { number: c.roundNumber })}
                  </div>
                  <div className="dash-item-sub">
                    {t('dashboard.dueDate', { date: fdate(c.dueDate) })}
                  </div>
                </div>
                <b className="dash-item-amount">{money(c.amountDue, c.currency)}</b>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Historique des paiements */}
      <div className="card mt">
        <div className="row between">
          <h3>📜 {t('payments.history')}</h3>
          <span className="mut sm">{t('payments.last3Months')}</span>
        </div>

        {loading ? (
          <p className="mut sm mt">{t('common.loading')}</p>
        ) : summary.recent.length === 0 ? (
          <Empty>{t('payments.noHistory')}</Empty>
        ) : (
          <div className="scroll mt">
            <table>
              <thead>
                <tr>
                  <th>{t('detail.date')}</th>
                  <th>{t('detail.type')}</th>
                  <th>{t('detail.name')}</th>
                  <th>{t('detail.amount')}</th>
                  <th>{t('detail.status')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((txn) => (
                  <tr key={txn.id}>
                    <td>{fdatetime(txn.createdAt)}</td>
                    <td>
                      {t(`type.${txn.type}`)} · <small className="mut">{t(`type.${txn.method}`)}</small>
                    </td>
                    <td>
                      {txn.tontineId ? (
                        <Link to={`/app/tontines/${txn.tontineId}`}>{txn.tontineName}</Link>
                      ) : (
                        '—'
                      )}
                      {txn.roundNumber && <small className="mut"> · {t('dashboard.tour', { number: txn.roundNumber })}</small>}
                    </td>
                    <td><b style={{ color: txn.type === 'payout' ? 'var(--em)' : 'var(--gold2)' }}>
                      {txn.type === 'payout' ? '+' : '−'}{money(txn.amount, txn.currency)}
                    </b></td>
                    <td><Badge v={txn.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export function Notifications() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], meta: null });
  const [tick, setTick] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null); // {id, title} ou 'all'
  const del = useAction();

  useEffect(() => {
    api(`/notifications${qs({ page, limit: 15 })}`).then(setRes).catch(() => {});
  }, [page, tick]);

  const markAllRead = async () => {
    await api('/notifications/read-all', { method: 'POST', body: {} });
    setTick(tick + 1);
  };

  const deleteOne = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (await del.run(() => api(`/notifications/${target.id}`, { method: 'DELETE' }))) {
      toast(t('notifications.deleted'), 'success');
      setTick(tick + 1);
    }
  };

  const deleteAll = async () => {
    setConfirmDelete(null);
    if (await del.run(() => api('/notifications', { method: 'DELETE' }))) {
      toast(t('notifications.allDeleted'), 'success');
      setPage(1);
      setTick(tick + 1);
    }
  };

  return (
    <>
      <div className="row between">
        <h1>{t('notifications.title')}</h1>
        <div className="row" style={{ gap: '.5rem' }}>
          <button className="btn ghost sm" onClick={markAllRead}>
            {t('notifications.markAllRead')}
          </button>
          {res.data.length > 0 && (
            <button className="btn danger sm" onClick={() => setConfirmDelete('all')}>
              <Icons.Delete size={14} /> {t('notifications.deleteAll')}
            </button>
          )}
        </div>
      </div>

      <Msg>{del.error}</Msg>

      <div className="grid mt">
        {res.data.length === 0 ? (
          <Empty>{t('notifications.none')}</Empty>
        ) : (
          res.data.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{ borderLeft: n.readAt ? undefined : '4px solid var(--gold)', position: 'relative' }}
            >
              <div className="row between" style={{ alignItems: 'flex-start', gap: '.5rem' }}>
                <div
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={async () => {
                    if (!n.readAt) {
                      await api(`/notifications/${n.id}/read`, { method: 'POST', body: {} });
                      setTick(tick + 1);
                    }
                  }}
                >
                  <b>{n.title}</b> <small className="mut">· {fdatetime(n.createdAt)}</small>
                  <p className="mut sm" style={{ margin: '.3rem 0 0' }}>{n.body}</p>
                </div>
                <button
                  className="btn ghost sm"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(n); }}
                  title={t('common.delete')}
                  style={{ color: 'var(--red)', flexShrink: 0 }}
                >
                  <Icons.Delete size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Pager meta={res.meta} onPage={setPage} />

      <ConfirmModal
        open={!!confirmDelete}
        title={confirmDelete === 'all' ? t('notifications.deleteAllConfirm') : t('notifications.deleteConfirm')}
        message={
          confirmDelete === 'all'
            ? t('notifications.deleteAllDesc')
            : confirmDelete
              ? t('notifications.deleteDesc', { title: confirmDelete.title })
              : ''
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger
        onConfirm={confirmDelete === 'all' ? deleteAll : deleteOne}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

// ============================================================
// PROFIL
// ============================================================
export function Profile() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [mode, setMode] = useState(null);
  const [f, setF] = useState({ fullName: user.fullName, phone: user.phone || '' });
  const a = useAction();

  useEffect(() => {
    api('/contributions/mine').then((r) => {
      const due = r.data || [];
      const totalDue = due.reduce((s, c) => s + Number(c.amountDue || 0), 0);
      setStats((prev) => ({ ...prev, contributionsDue: due.length, totalDue }));
    }).catch(() => {});
    api('/admin/stats').then((r) => setStats((prev) => ({ ...prev, activeTontines: r.data?.activeTontines }))).catch(() => {});
    api('/auth/sessions').then((r) => setStats((prev) => ({ ...prev, sessions: (r.data || []).length }))).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (await a.run(() => api('/users/me', { method: 'PATCH', body: { fullName: f.fullName, phone: f.phone || null } }), t('profile.updated'))) {
      await refresh();
      setMode(null);
    }
  };

  return (
    <>
      <h1>{t('profile.title')}</h1>

      <div className="card mt profile-header">
        <div className="row" style={{ gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar name={user.fullName} size={96} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ marginBottom: '.2rem' }}>{user.fullName}</h2>
            <p className="mut" style={{ margin: 0 }}>{user.email}</p>
            <div className="row" style={{ gap: '.5rem', marginTop: '.6rem' }}>
              <Badge v={user.role} />
              <Badge v="validated" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid g4 mt">
        <Tilt className="stat"><b>{stats?.activeTontines ?? '—'}</b><span>{t('dashboard.activeTontines')}</span></Tilt>
        <Tilt className="stat"><b>{stats?.contributionsDue ?? '—'}</b><span>{t('dashboard.contributionsDue')}</span></Tilt>
        <Tilt className="stat"><b>{stats ? money(stats.totalDue, 'XOF') : '—'}</b><span>{t('dashboard.amountOwed')}</span></Tilt>
        <Tilt className="stat"><b>{stats?.sessions ?? '—'}</b><span>{t('settings.activeSessions')}</span></Tilt>
      </div>

      <div className="card mt">
        <div className="row between">
          <h3>{t('profile.myInfos')}</h3>
          {mode !== 'edit' && (
            <button className="btn ghost sm" onClick={() => { setF({ fullName: user.fullName, phone: user.phone || '' }); setMode('edit'); }}>
              <Icons.Edit size={14} /> {t('profile.edit')}
            </button>
          )}
        </div>

        {mode === 'edit' ? (
          <form onSubmit={save} style={{ maxWidth: 480 }}>
            <label>{t('profile.fullName')}</label>
            <input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
            <label>{t('profile.phone')}</label>
            <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+229 ..." />
            <Msg>{a.error}</Msg>
            <Msg kind="ok">{a.info}</Msg>
            <div className="row mt" style={{ gap: '.5rem' }}>
              <button type="button" className="btn ghost" onClick={() => setMode(null)}>{t('common.cancel')}</button>
              <button className="btn" disabled={a.busy}>{a.busy ? '…' : t('common.save')}</button>
            </div>
          </form>
        ) : (
          <div className="mt">
            <div className="info-row"><span className="mut sm">{t('profile.fullName')}</span><span>{user.fullName}</span></div>
            <div className="info-row"><span className="mut sm">{t('profile.email')}</span><span>{user.email}</span></div>
            <div className="info-row"><span className="mut sm">{t('profile.phone')}</span><span>{user.phone || <span className="mut">{t('profile.notProvided')}</span>}</span></div>
          </div>
        )}
      </div>

      <div className="card mt">
        <h3>{t('profile.quickActions')}</h3>
        <div className="row mt" style={{ gap: '.5rem' }}>
          <button className="btn ghost" onClick={() => nav('/app/parametres')}>
            <Icons.Lock size={16} /> {t('profile.changePassword')}
          </button>
          <button className="btn ghost" onClick={() => nav('/app/parametres')}>
            <Icons.Phone size={16} /> {t('profile.managePin')}
          </button>
          <button className="btn ghost" onClick={() => nav('/app/parametres')}>
            <Icons.Globe size={16} /> {t('profile.mySessions')}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// PARAMÈTRES
// ============================================================
export function Settings() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('security');

  const tabs = [
    ['security', t('settings.security')],
    ['sessions', t('settings.sessions')],
    ['preferences', t('settings.preferences')],
    ['danger', t('settings.danger')],
  ];

  return (
    <>
      <h1>{t('settings.title')}</h1>
      <p className="mut" style={{ marginTop: '-.3rem' }}>{t('settings.subtitle')}</p>

      <div className="tabs" style={{ marginTop: '1.5rem' }}>
        {tabs.map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'security' && <SecurityTab />}
      {tab === 'sessions' && <SessionsTab />}
      {tab === 'preferences' && <PreferencesTab />}
      {tab === 'danger' && <DangerTab />}
    </>
  );
}

function SecurityTab() {
  const { t } = useTranslation();
  const pw = useAction();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });

  return (
    <div className="grid g2">
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        if (await pw.run(() => api('/auth/change-password', { method: 'POST', body: f }), t('settings.passwordChanged'))) {
          setF({ currentPassword: '', newPassword: '' });
        }
      }}>
        <h3><Icons.Lock size={18} /> {t('settings.changePassword')}</h3>
        <p className="mut sm">{t('settings.changePasswordDesc')}</p>
        <label>{t('settings.currentPassword')}</label>
        <input required type="password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} autoComplete="current-password" />
        <label>{t('settings.newPassword')}</label>
        <input required type="password" minLength={10} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} autoComplete="new-password" />
        <Msg>{pw.error}</Msg>
        <Msg kind="ok">{pw.info}</Msg>
        <button className="btn mt" disabled={pw.busy}>{pw.busy ? '…' : t('settings.changeBtn')}</button>
      </form>

      <div className="card">
        <h3><Icons.Phone size={18} /> {t('settings.codePin')}</h3>
        <p className="mut sm">{t('settings.codePinDesc')}</p>
        <PinSettings />
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3><Icons.Key size={18} /> {t('settings.twoFA')}</h3>
        <TwoFASettings />
      </div>
    </div>
  );
}

function SessionsTab() {
  const { t } = useTranslation();
  return (
    <div className="grid">
      <div className="card">
        <h3><Icons.Globe size={18} /> {t('settings.activeSessions')}</h3>
        <p className="mut sm">{t('settings.activeSessionsDesc')}</p>
        <SessionsList />
      </div>
      <div className="card">
        <h3><Icons.File size={18} /> {t('settings.loginHistory')}</h3>
        <p className="mut sm">{t('settings.loginHistoryDesc')}</p>
        <LoginHistory />
      </div>
    </div>
  );
}

function SessionsList() {
  const { t } = useTranslation();
  const ses = useAction();
  const [sessions, setS] = useState([]);
  const load = () => api('/auth/sessions').then((r) => setS(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!sessions.length) return <p className="mut sm mt">{t('common.loading')}</p>;

  return (
    <div className="mt">
      {sessions.map((s) => (
        <div key={s.id} className="session-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="row" style={{ gap: '.5rem' }}>
              {s.current && <Badge v="active" />}
              <span className="sm">{s.current ? t('settings.currentSession') : t('settings.otherSession')}</span>
            </div>
            <div className="mut sm" style={{ wordBreak: 'break-word', marginTop: '.2rem' }}>
              {s.userAgent || t('settings.unknownDevice')}
            </div>
            <div className="mut sm">📍 {s.ip} · 🕐 {fdatetime(s.lastSeenAt)}</div>
          </div>
          {!s.current && (
            <button className="btn ghost sm" onClick={async () => {
              await ses.run(() => api(`/auth/sessions/${s.id}`, { method: 'DELETE', body: {} }));
              load();
            }}>{t('settings.revoke')}</button>
          )}
        </div>
      ))}
    </div>
  );
}

function PreferencesTab() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const a = useAction();
  const [emailNotif, setEmailNotif] = useState(user.emailNotifications !== false);

  const toggle = async () => {
    const next = !emailNotif;
    setEmailNotif(next);
    if (await a.run(() => api('/users/me/preferences', { method: 'PATCH', body: { emailNotifications: next } }), t('settings.saved'))) {
      await refresh();
    } else {
      setEmailNotif(!next);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h3><Icons.Notifications size={18} /> {t('settings.notifications')}</h3>
      <p className="mut sm">{t('settings.notificationsDesc')}</p>

      <div className="pref-row">
        <div>
          <div style={{ fontWeight: 600 }}>{t('settings.emailNotifications')}</div>
          <div className="mut sm">{t('settings.emailNotificationsDesc')}</div>
        </div>
        <button
          className={`switch ${emailNotif ? 'on' : ''}`}
          onClick={toggle}
          disabled={a.busy}
          aria-label="Toggle notifications"
        >
          <span className="switch-knob" />
        </button>
      </div>

      <Msg>{a.error}</Msg>
      <Msg kind="ok">{a.info}</Msg>
    </div>
  );
}

function DangerTab() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const nav = useNavigate();
  const del = useAction();
  const [delPw, setDelPw] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (confirmText !== 'DELETE' && confirmText !== 'SUPPRIMER') {
      del.setError(t('settings.typeDelete'));
      return;
    }
    if (await del.run(() => api('/users/me', { method: 'DELETE', body: { password: delPw } }))) {
      await logout();
      nav('/');
    }
  };

  return (
    <div className="card danger-zone" style={{ maxWidth: 620 }}>
      <h3><Icons.Warning size={18} /> {t('settings.dangerZone')}</h3>
      <p className="mut sm">{t('settings.dangerZoneDesc')}</p>
      <p className="mut sm"><b>{t('settings.dangerZoneImpossible')}</b></p>

      <form onSubmit={submit} className="mt">
        <label>{t('auth.password')}</label>
        <input required type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" />

        <label>{t('settings.typeDelete')}</label>
        <input required value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SUPPRIMER" />

        <Msg>{del.error}</Msg>
        <button className="btn danger mt" disabled={del.busy || (confirmText !== 'DELETE' && confirmText !== 'SUPPRIMER')}>
          {t('settings.deleteAccount')}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// CODE PIN
// ============================================================
function PinSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [password, setPassword] = useState('');
  const a = useAction();

  const load = () => api('/auth/pin/status').then((r) => setStatus(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const reset = () => { setMode(null); setPin(''); setConfirmPin(''); setPassword(''); a.setError(''); a.setInfo(''); };

  const submitSet = async (e) => {
    e.preventDefault();
    if (pin !== confirmPin) { a.setError(t('auth.passwordMismatch')); return; }
    if (!/^\d{4}$/.test(pin)) { a.setError('PIN 4 digits'); return; }
    if (await a.run(() => api('/auth/pin/set', { method: 'POST', body: { pin, password } }), t('settings.pinSaved'))) {
      reset(); load();
    }
  };

  const submitRemove = async (e) => {
    e.preventDefault();
    if (await a.run(() => api('/auth/pin/remove', { method: 'POST', body: { password } }), t('settings.pinDisabled'))) {
      reset(); load();
    }
  };

  if (status === null) return <p className="mut sm">{t('common.loading')}</p>;

  if (mode === null) {
    return (
      <>
        <p className="mt">{t('settings.pinStatus')} : {status.hasPin ? <Badge v="active" /> : <Badge v="pending" />}</p>
        {status.locked && <Msg kind="err">{t('settings.pinLocked', { date: fdatetime(status.lockedUntil) })}</Msg>}
        <div className="row mt" style={{ gap: '.5rem' }}>
          {status.hasPin ? (
            <>
              <button className="btn" onClick={() => setMode('set')}>{t('settings.pinChange')}</button>
              <button className="btn danger" onClick={() => setMode('remove')}>{t('settings.pinDisable')}</button>
            </>
          ) : (
            <button className="btn" onClick={() => setMode('set')}>{t('settings.pinSet')}</button>
          )}
        </div>
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
      </>
    );
  }

  if (mode === 'set') {
    return (
      <form onSubmit={submitSet}>
        <label>{t('settings.newPassword')} (PIN)</label>
        <input type="password" inputMode="numeric" maxLength={4} pattern="\d{4}" required value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoComplete="off" />
        <label>{t('auth.confirmPassword')}</label>
        <input type="password" inputMode="numeric" maxLength={4} pattern="\d{4}" required value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoComplete="off" />
        <label>{t('auth.password')}</label>
        <input type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
        <div className="row mt" style={{ gap: '.5rem' }}>
          <button type="button" className="btn ghost" onClick={reset}>{t('common.cancel')}</button>
          <button className="btn" disabled={a.busy || pin.length !== 4 || confirmPin.length !== 4}>
            {a.busy ? '…' : t('common.save')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitRemove}>
      <p className="mut sm">{t('settings.codePinDesc')}</p>
      <label>{t('auth.password')}</label>
      <input type="password" required value={password}
        onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      <Msg>{a.error}</Msg>
      <div className="row mt" style={{ gap: '.5rem' }}>
        <button type="button" className="btn ghost" onClick={reset}>{t('common.cancel')}</button>
        <button className="btn danger" disabled={a.busy}>{t('settings.pinDisable')}</button>
      </div>
    </form>
  );
}

// ============================================================
// 2FA
// ============================================================
function TwoFASettings() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [status, setStatus] = useState(null);
  const [mode, setMode] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const a = useAction();

  const load = () => api('/auth/2fa/status').then((r) => setStatus(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const reset = () => {
    setMode(null); setSetup(null); setCode(''); setPassword(''); setBackupCodes(null);
    a.setError(''); a.setInfo('');
  };

  const startSetup = async () => {
    const r = await a.run(() => api('/auth/2fa/setup', { method: 'POST', body: {} }));
    if (r) { setSetup(r.data); setMode('enable'); }
  };

  const enable = async (e) => {
    e.preventDefault();
    const r = await a.run(() => api('/auth/2fa/enable', { method: 'POST', body: { code } }), t('settings.saved'));
    if (r) { setBackupCodes(r.data.backupCodes); setMode('backup-codes'); await refresh(); }
  };

  const disable = async (e) => {
    e.preventDefault();
    if (await a.run(() => api('/auth/2fa/disable', { method: 'POST', body: { password } }), t('common.success'))) {
      reset(); load(); await refresh();
    }
  };

  if (status === null) return <p className="mut sm">{t('common.loading')}</p>;

  if (mode === null) {
    return (
      <>
        <p className="mut sm">{t('settings.changePasswordDesc')}</p>
        <p className="mt">{t('settings.pinStatus')} : {status.enabled ? <Badge v="active" /> : <Badge v="pending" />}</p>
        <div className="row mt" style={{ gap: '.5rem' }}>
          {status.enabled ? (
            <button className="btn danger" onClick={() => setMode('disable')}>{t('common.delete')}</button>
          ) : (
            <button className="btn" onClick={startSetup} disabled={a.busy}>
              <Icons.Key size={16} /> {t('settings.twoFA')}
            </button>
          )}
        </div>
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
      </>
    );
  }

  if (mode === 'enable') {
    return (
      <form onSubmit={enable}>
        <h4>1. {t('common.search')}</h4>
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <img src={setup.qrCode} alt="QR Code 2FA" style={{ maxWidth: 240, borderRadius: 12, background: '#fff', padding: 8 }} />
        </div>
        <code style={{ display: 'block', marginTop: '.5rem', padding: '.6rem', background: 'rgba(0,0,0,.3)', borderRadius: 8, wordBreak: 'break-all', fontSize: '.85rem' }}>
          {setup.secret}
        </code>
        <h4>2. {t('auth.2faCode')}</h4>
        <input type="text" inputMode="numeric" maxLength={6} pattern="\d{6}" required value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          style={{ fontSize: '1.3rem', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700 }}
          autoFocus />
        <Msg>{a.error}</Msg>
        <div className="row mt" style={{ gap: '.5rem' }}>
          <button type="button" className="btn ghost" onClick={reset}>{t('common.cancel')}</button>
          <button className="btn" disabled={a.busy || code.length !== 6}>{t('auth.validate')}</button>
        </div>
      </form>
    );
  }

  if (mode === 'backup-codes') {
    return (
      <>
        <h4>✅ 2FA</h4>
        <Msg kind="ok">{t('common.success')}</Msg>
        <div className="backup-codes-grid">
          {backupCodes.map((c, i) => (
            <code key={i} className="backup-code">{c}</code>
          ))}
        </div>
        <button className="btn mt" onClick={async () => {
          try {
            await navigator.clipboard.writeText(backupCodes.join('\n'));
            a.setInfo(t('common.success'));
          } catch { /* ignore */ }
        }}>
          <Icons.Copy size={16} /> {t('common.save')}
        </button>
        <button className="btn ghost mt" onClick={() => { reset(); load(); }} style={{ width: '100%' }}>
          {t('common.close')}
        </button>
      </>
    );
  }

  return (
    <form onSubmit={disable}>
      <p className="mut sm">{t('settings.codePinDesc')}</p>
      <label>{t('auth.password')}</label>
      <input type="password" required value={password}
        onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      <Msg>{a.error}</Msg>
      <div className="row mt" style={{ gap: '.5rem' }}>
        <button type="button" className="btn ghost" onClick={reset}>{t('common.cancel')}</button>
        <button className="btn danger" disabled={a.busy}>{t('common.delete')}</button>
      </div>
    </form>
  );
}

// ============================================================
// HISTORIQUE CONNEXIONS
// ============================================================
function LoginHistory() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], meta: null });

  useEffect(() => {
    api(`/auth/login-history${qs({ page, limit: 10 })}`).then(setRes).catch(() => {});
  }, [page]);

  if (!res.data.length) return <p className="mut sm">{t('settings.noLogin')}</p>;

  const fmtUA = (ua) => {
    if (!ua) return t('settings.unknownDevice');
    if (/mobile/i.test(ua)) return '📱 Mobile';
    if (/tablet|ipad/i.test(ua)) return '📱 Tablet';
    return '💻 Desktop';
  };

  return (
    <>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>{t('admin.date')}</th>
              <th>{t('settings.device')}</th>
              <th>{t('settings.ip')}</th>
              <th>{t('settings.result')}</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((l) => (
              <tr key={l.id}>
                <td>{fdatetime(l.createdAt)}</td>
                <td className="mut sm">{fmtUA(l.userAgent)}</td>
                <td className="mut sm">{l.ip || '—'}</td>
                <td>{l.result === 'success' ? <Badge v="validated" /> : <Badge v="failed" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager meta={res.meta} onPage={setPage} />
    </>
  );
}

// ============================================================
// ADMIN
// ============================================================
export function Admin() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState({ data: [], meta: null });
  const [logs, setLogs] = useState({ data: [], meta: null });
  const [up, setUp] = useState(1);
  const [lp, setLp] = useState(1);
  const [q, setQ] = useState('');
  const [tick, setTick] = useState(0);
  const a = useAction();

  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState(null);
  const [userTontines, setUserTontines] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const del = useAction();

  useEffect(() => { api('/admin/stats').then((r) => setStats(r.data)).catch(() => {}); }, []);
  useEffect(() => { api(`/admin/users${qs({ page: up, q, limit: 10 })}`).then(setUsers).catch(() => {}); }, [up, q, tick]);
  useEffect(() => { api(`/admin/audit-logs${qs({ page: lp, limit: 12 })}`).then(setLogs).catch(() => {}); }, [lp, tick]);

  const patch = async (id, body) => {
    if (await a.run(() => api(`/admin/users/${id}`, { method: 'PATCH', body }))) setTick(tick + 1);
  };

  const removeUser = async (user) => {
    setConfirmDelete(null);
    const r = await del.run(() => api(`/admin/users/${user.id}`, { method: 'DELETE' }));
    if (r) {
      toast(t('admin.userDeleted'), 'success');
      setTick(tick + 1);
    }
  };

  const openUserTontines = async (u) => {
    try {
      const r = await api(`/admin/users/${u.id}/tontines`);
      setUserTontines(r.data);
    } catch (e) {
      toast(e.message || t('common.error'), 'error');
    }
  };

  return (
    <>
      <h1>{t('admin.title')}</h1>

      {stats && (
        <div className="grid g4 mt">
          {[
            [t('admin.activeUsers'), stats.users],
            [t('admin.activeTontines'), stats.activeTontines],
            [t('admin.validatedTxns'), stats.validatedTransactions],
            [t('admin.incidents24h'), stats.failures24h],
          ].map(([l, v]) => (
            <Tilt key={l} className="stat"><b>{v}</b><span>{l}</span></Tilt>
          ))}
        </div>
      )}

      <div className="card mt">
        <div className="row between">
          <h3>{t('admin.users')}</h3>
          <div className="row" style={{ gap: '.5rem' }}>
            <input
              style={{ maxWidth: 240 }}
              placeholder={t('admin.search')}
              value={q}
              onChange={(e) => { setQ(e.target.value); setUp(1); }}
            />
            <button className="btn" onClick={() => setShowCreate(true)}>
              {t('admin.createUser')}
            </button>
          </div>
        </div>
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>{t('admin.name')}</th><th>{t('admin.email')}</th><th>{t('admin.role')}</th><th>{t('admin.status')}</th><th /></tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td className="mut">{u.email}</td>
                  <td><Badge v={u.role} /></td>
                  <td><Badge v={u.status === 'disabled' ? 'failed' : 'active'} /></td>
                  <td className="row">
                    {u.status !== 'deleted' && <>
                      <button className="btn ghost sm" onClick={() => openUserTontines(u)}>{t('admin.tontines')}</button>
                      <button className="btn ghost sm" onClick={() => patch(u.id, { status: u.status === 'active' ? 'disabled' : 'active' })}>
                        {u.status === 'active' ? t('admin.disable') : t('admin.enable')}
                      </button>
                      <button className="btn ghost sm" onClick={() => patch(u.id, { role: u.role === 'admin' ? 'member' : 'admin' })}>
                        {u.role === 'admin' ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                      </button>
                      <button
                        className="btn ghost sm"
                        onClick={() => setConfirmDelete(u)}
                        title={t('common.delete')}
                        style={{ color: 'var(--red)' }}
                      >
                        <Icons.Delete size={14} />
                      </button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager meta={users.meta} onPage={setUp} />
      </div>

      <div className="card mt">
        <h3>{t('admin.auditLog')}</h3>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>{t('admin.date')}</th>
                <th>{t('admin.user')}</th>
                <th>{t('admin.action')}</th>
                <th>{t('admin.resource')}</th>
                <th>{t('admin.result')}</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.data.map((l) => (
                <tr key={l.id}>
                  <td>{fdatetime(l.createdAt)}</td>
                  <td>{l.userId ?? '—'}</td>
                  <td>{l.action}</td>
                  <td>{l.resourceType ? `${l.resourceType} #${l.resourceId ?? ''}` : '—'}</td>
                  <td><Badge v={l.result === 'success' ? 'validated' : 'failed'} /></td>
                  <td className="mut">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager meta={logs.meta} onPage={setLp} />
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={(data) => { setShowCreate(false); setCreated(data); setTick(tick + 1); }}
        />
      )}

      {created && <CreatedUserModal data={created} onClose={() => setCreated(null)} />}
      {userTontines && <UserTontinesModal data={userTontines} onClose={() => setUserTontines(null)} />}

      <ConfirmModal
        open={!!confirmDelete}
        title={t('admin.deleteConfirm')}
        message={confirmDelete ? t('admin.deleteDesc', { name: confirmDelete.fullName }) : ''}
        confirmText={t('admin.deleteBtn')}
        cancelText={t('common.cancel')}
        danger
        onConfirm={() => removeUser(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', role: 'member', sendEmail: true });
  const a = useAction();

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...f };
    if (!body.phone) delete body.phone;
    const r = await a.run(() => api('/admin/users', { method: 'POST', body }));
    if (r) onCreated(r.data);
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('admin.createUser')}</h3>
        <form onSubmit={submit}>
          <label>{t('auth.fullName')} *</label>
          <input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoFocus />
          <label>{t('auth.email')} *</label>
          <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <label>{t('auth.phone')} ({t('common.optional')})</label>
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+229 ..." />
          <label>{t('admin.role')}</label>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="member">{t('role.member')}</option>
            <option value="admin">{t('role.admin')}</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '1rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.sendEmail} onChange={(e) => setF({ ...f, sendEmail: e.target.checked })} style={{ width: 'auto', minHeight: 'auto' }} />
            <span>{t('settings.emailNotifications')}</span>
          </label>
          <Msg>{a.error}</Msg>
          <div className="row between mt" style={{ gap: '.6rem' }}>
            <button type="button" className="btn ghost" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn" disabled={a.busy}>{a.busy ? '…' : t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatedUserModal({ data, onClose }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>✅ {t('admin.userCreated')}</h3>
        {data.emailSent ? (
          <Msg kind="ok">{t('common.success')} : {data.user.email}</Msg>
        ) : (
          <Msg kind="err">{t('common.error')}{data.emailError ? ` (${data.emailError})` : ''}</Msg>
        )}
        <div className="card" style={{ background: 'rgba(0,0,0,.3)', marginTop: '1rem' }}>
          <div className="sm mut">{t('auth.email')}</div>
          <div style={{ wordBreak: 'break-all' }}><b>{data.user.email}</b></div>
          <div className="sm mut mt">{t('auth.password')}</div>
          <div className="row between" style={{ gap: '.5rem' }}>
            <code style={{ background: 'rgba(242,182,50,.15)', padding: '.4rem .7rem', borderRadius: 8, fontSize: '1rem', color: 'var(--gold2)', letterSpacing: '0.05em', flex: 1, wordBreak: 'break-all' }}>
              {data.generatedPassword}
            </code>
            <button className="btn sm" onClick={copy}>{copied ? '✓' : t('common.save')}</button>
          </div>
        </div>
        <button className="btn mt" onClick={onClose} style={{ width: '100%' }}>{t('common.close')}</button>
      </div>
    </div>
  );
}

function UserTontinesModal({ data, onClose }) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h3>{t('admin.tontines')} : {data.user.fullName}</h3>
        <p className="mut sm">{data.user.email}</p>
        {data.tontines.length === 0 ? (
          <p className="mut mt">{t('tontines.empty')}</p>
        ) : (
          <div className="scroll mt" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr><th>{t('admin.name')}</th><th>{t('admin.role')}</th><th>{t('detail.amount')}</th><th>{t('detail.tours')}</th><th>{t('admin.status')}</th></tr>
              </thead>
              <tbody>
                {data.tontines.map((tontine) => (
                  <tr key={tontine.id}>
                    <td><b>{tontine.name}</b></td>
                    <td><Badge v={tontine.role} /></td>
                    <td>{money(tontine.contributionAmount, tontine.currency)}</td>
                    <td className="sm mut">{tontine.roundsDone}/{tontine.roundsTotal}</td>
                    <td><Badge v={tontine.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button className="btn mt" onClick={onClose} style={{ width: '100%' }}>{t('common.close')}</button>
      </div>
    </div>
  );
}