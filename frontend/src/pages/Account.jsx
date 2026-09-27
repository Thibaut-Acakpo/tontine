import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, money, fdate, fdatetime, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Tilt } from '../components/Fx.jsx';
import { Badge, Empty, Msg, Pager, useAction, toast, ConfirmModal } from '../components/ui.jsx';
import { Icons } from '../components/Icons.jsx';
import { PayOnline } from './TontineDetail.jsx';

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

export function Payments() {
  const [due, setDue] = useState(null);
  useEffect(() => { api('/contributions/mine').then((r) => setDue(r.data)).catch(() => setDue([])); }, []);
  return (
    <>
      <h1>Paiements</h1><p className="mut">Vos cotisations du tour en cours. L'historique détaillé se trouve dans chaque tontine (onglet « Historique »).</p>
      <div className="grid g2 mt">{due === null ? <p className="mut">Chargement…</p> : due.length === 0 ? <Empty>Aucune cotisation à régler. 🎉</Empty> : due.map((c) => (
        <Tilt key={c.id}><h3><Link to={`/app/tontines/${c.tontineId}`}>{c.tontineName}</Link></h3><p className="mut sm">Tour {c.roundNumber} · échéance {fdate(c.dueDate)}</p><div className="row between"><b>{money(c.amountDue, c.currency)}</b><PayOnline contributionId={c.id} /></div></Tilt>
      ))}</div>
    </>
  );
}

export function MockPay() {
  const { reference } = useParams(); const [p] = useSearchParams(); const a = useAction(); const nav = useNavigate();
  const act = (outcome) => async () => { if (await a.run(() => api('/payments/dev/simulate', { method: 'POST', body: { reference, outcome } }))) nav('/app/paiements'); };
  return (
    <div className="card checkout"><h2>Paiement simulé</h2><p className="mut">Environnement de développement : aucune somme réelle n'est débitée.</p>
      <p><b>{Number(p.get('amount') || 0).toLocaleString('fr-FR')} {p.get('currency') === 'XOF' ? 'FCFA' : p.get('currency')}</b></p><Msg>{a.error}</Msg>
      <div className="row" style={{ justifyContent: 'center' }}><button className="btn" disabled={a.busy} onClick={act('succeeded')}>Simuler un succès</button><button className="btn danger" disabled={a.busy} onClick={act('failed')}>Simuler un échec</button></div></div>
  );
}

export function Notifications() {
  const [page, setPage] = useState(1); const [res, setRes] = useState({ data: [], meta: null }); const [tick, setTick] = useState(0);
  useEffect(() => { api(`/notifications${qs({ page, limit: 15 })}`).then(setRes).catch(() => {}); }, [page, tick]);
  return (
    <>
      <div className="row between"><h1>Notifications</h1><button className="btn ghost" onClick={async () => { await api('/notifications/read-all', { method: 'POST', body: {} }); setTick(tick + 1); }}>Tout marquer comme lu</button></div>
      <div className="grid mt">{res.data.length === 0 ? <Empty>Aucune notification.</Empty> : res.data.map((n) => (
        <Tilt key={n.id} max={3} onClick={async () => { if (!n.readAt) { await api(`/notifications/${n.id}/read`, { method: 'POST', body: {} }); setTick(tick + 1); } }} style={{ borderLeft: n.readAt ? undefined : '4px solid var(--gold)', cursor: 'pointer' }}>
          <b>{n.title}</b> <small className="mut">· {fdatetime(n.createdAt)}</small><p className="mut sm" style={{ margin: '.3rem 0 0' }}>{n.body}</p></Tilt>
      ))}</div><Pager meta={res.meta} onPage={setPage} />
    </>
  );
}

// ✅ PAGE PROFIL
export function Profile() {
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
    if (await a.run(() => api('/users/me', { method: 'PATCH', body: { fullName: f.fullName, phone: f.phone || null } }), 'Profil mis à jour')) {
      await refresh();
      setMode(null);
    }
  };

  return (
    <>
      <h1>Mon profil</h1>

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
        <Tilt className="stat"><b>{stats?.activeTontines ?? '—'}</b><span>Tontines actives</span></Tilt>
        <Tilt className="stat"><b>{stats?.contributionsDue ?? '—'}</b><span>Cotisations à régler</span></Tilt>
        <Tilt className="stat"><b>{stats ? money(stats.totalDue, 'XOF') : '—'}</b><span>Montant dû</span></Tilt>
        <Tilt className="stat"><b>{stats?.sessions ?? '—'}</b><span>Sessions actives</span></Tilt>
      </div>

      <div className="card mt">
        <div className="row between">
          <h3>Informations personnelles</h3>
          {mode !== 'edit' && (
            <button className="btn ghost sm" onClick={() => { setF({ fullName: user.fullName, phone: user.phone || '' }); setMode('edit'); }}>
              <Icons.Edit size={14} /> Modifier
            </button>
          )}
        </div>

        {mode === 'edit' ? (
          <form onSubmit={save} style={{ maxWidth: 480 }}>
            <label>Nom complet</label>
            <input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
            <label>Téléphone</label>
            <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+229 ..." />
            <Msg>{a.error}</Msg>
            <Msg kind="ok">{a.info}</Msg>
            <div className="row mt" style={{ gap: '.5rem' }}>
              <button type="button" className="btn ghost" onClick={() => setMode(null)}>Annuler</button>
              <button className="btn" disabled={a.busy}>{a.busy ? '…' : 'Enregistrer'}</button>
            </div>
          </form>
        ) : (
          <div className="mt">
            <div className="info-row"><span className="mut sm">Nom complet</span><span>{user.fullName}</span></div>
            <div className="info-row"><span className="mut sm">Email</span><span>{user.email}</span></div>
            <div className="info-row"><span className="mut sm">Téléphone</span><span>{user.phone || <span className="mut">Non renseigné</span>}</span></div>
          </div>
        )}
      </div>

      <div className="card mt">
        <h3>Actions rapides</h3>
        <div className="row mt" style={{ gap: '.5rem' }}>
          <button className="btn ghost" onClick={() => nav('/app/parametres')}>
            <Icons.Lock size={16} /> Changer le mot de passe
          </button>
          <button className="btn ghost" onClick={() => nav('/app/parametres')}>
            <Icons.Phone size={16} /> Gérer le code PIN
          </button>
          <button className="btn ghost" onClick={() => nav('/app/parametres')}>
            <Icons.Globe size={16} /> Voir mes sessions
          </button>
        </div>
      </div>
    </>
  );
}

// ✅ PARAMÈTRES à onglets
export function Settings() {
  const [tab, setTab] = useState('security');

  const tabs = [
    ['security', '🔐 Sécurité'],
    ['sessions', '🌐 Sessions'],
    ['preferences', '🔔 Préférences'],
    ['danger', '⚠️ Danger'],
  ];

  return (
    <>
      <h1>Paramètres</h1>
      <p className="mut" style={{ marginTop: '-.3rem' }}>
        Gérez la sécurité de votre compte, vos sessions et vos préférences.
      </p>

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
  const pw = useAction();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });

  return (
    <div className="grid g2">
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        if (await pw.run(() => api('/auth/change-password', { method: 'POST', body: f }), 'Mot de passe modifié (autres sessions déconnectées)')) {
          setF({ currentPassword: '', newPassword: '' });
        }
      }}>
        <h3><Icons.Lock size={18} /> Changer le mot de passe</h3>
        <p className="mut sm">Utilisez un mot de passe fort, unique, et que vous n'utilisez nulle part ailleurs.</p>
        <label>Mot de passe actuel</label>
        <input required type="password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} autoComplete="current-password" />
        <label>Nouveau mot de passe</label>
        <input required type="password" minLength={10} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} autoComplete="new-password" />
        <Msg>{pw.error}</Msg>
        <Msg kind="ok">{pw.info}</Msg>
        <button className="btn mt" disabled={pw.busy}>{pw.busy ? '…' : 'Modifier le mot de passe'}</button>
      </form>

      <div className="card">
        <h3><Icons.Phone size={18} /> Code PIN</h3>
        <p className="mut sm">Un code à 4 chiffres pour vous connecter rapidement sans retaper votre mot de passe.</p>
        <PinSettings />
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3><Icons.Key size={18} /> Authentification à deux facteurs (2FA)</h3>
        <TwoFASettings />
      </div>
    </div>
  );
}

function SessionsTab() {
  return (
    <div className="grid">
      <div className="card">
        <h3><Icons.Globe size={18} /> Sessions actives</h3>
        <p className="mut sm">Appareils actuellement connectés à votre compte. Vous pouvez révoquer ceux que vous ne reconnaissez pas.</p>
        <SessionsList />
      </div>

      <div className="card">
        <h3><Icons.File size={18} /> Historique des connexions</h3>
        <p className="mut sm">Les 10 dernières tentatives de connexion à votre compte.</p>
        <LoginHistory />
      </div>
    </div>
  );
}

function SessionsList() {
  const ses = useAction();
  const [sessions, setS] = useState([]);
  const load = () => api('/auth/sessions').then((r) => setS(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  if (!sessions.length) return <p className="mut sm mt">Aucune session active.</p>;

  return (
    <div className="mt">
      {sessions.map((s) => (
        <div key={s.id} className="session-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="row" style={{ gap: '.5rem' }}>
              {s.current && <Badge v="active" />}
              <span className="sm">{s.current ? 'Session actuelle' : 'Autre session'}</span>
            </div>
            <div className="mut sm" style={{ wordBreak: 'break-word', marginTop: '.2rem' }}>
              {s.userAgent || 'Appareil inconnu'}
            </div>
            <div className="mut sm">📍 {s.ip} · 🕐 vue {fdatetime(s.lastSeenAt)}</div>
          </div>
          {!s.current && (
            <button className="btn ghost sm" onClick={async () => {
              await ses.run(() => api(`/auth/sessions/${s.id}`, { method: 'DELETE', body: {} }));
              load();
            }}>Révoquer</button>
          )}
        </div>
      ))}
    </div>
  );
}

function PreferencesTab() {
  const { user, refresh } = useAuth();
  const a = useAction();
  const [emailNotif, setEmailNotif] = useState(user.emailNotifications !== false);

  const toggle = async () => {
    const next = !emailNotif;
    setEmailNotif(next);
    if (await a.run(() => api('/users/me/preferences', { method: 'PATCH', body: { emailNotifications: next } }), 'Préférences enregistrées')) {
      await refresh();
    } else {
      setEmailNotif(!next);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h3><Icons.Notifications size={18} /> Notifications</h3>
      <p className="mut sm">Choisissez les notifications que vous souhaitez recevoir par email.</p>

      <div className="pref-row">
        <div>
          <div style={{ fontWeight: 600 }}>Notifications par email</div>
          <div className="mut sm">Cotisations, versements, rappels d'échéance, etc.</div>
        </div>
        <button
          className={`switch ${emailNotif ? 'on' : ''}`}
          onClick={toggle}
          disabled={a.busy}
          aria-label="Basculer les notifications"
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
  const { logout } = useAuth();
  const nav = useNavigate();
  const del = useAction();
  const [delPw, setDelPw] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (confirmText !== 'SUPPRIMER') {
      del.setError('Tapez SUPPRIMER pour confirmer');
      return;
    }
    if (await del.run(() => api('/users/me', { method: 'DELETE', body: { password: delPw } }))) {
      await logout();
      nav('/');
    }
  };

  return (
    <div className="card danger-zone" style={{ maxWidth: 620 }}>
      <h3><Icons.Warning size={18} /> Zone de danger</h3>
      <p className="mut sm">
        La suppression de votre compte est <b>définitive</b>. Vos données personnelles seront anonymisées,
        mais l'historique financier des tontines est conservé pour préserver l'intégrité du livre de comptes.
      </p>
      <p className="mut sm">
        <b>Impossible</b> tant que vous participez à une tontine en cours.
      </p>

      <form onSubmit={submit} className="mt">
        <label>Mot de passe</label>
        <input required type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" />

        <label>Tapez <code>SUPPRIMER</code> pour confirmer</label>
        <input required value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SUPPRIMER" />

        <Msg>{del.error}</Msg>
        <button className="btn danger mt" disabled={del.busy || confirmText !== 'SUPPRIMER'}>
          Supprimer définitivement mon compte
        </button>
      </form>
    </div>
  );
}

// ✅ Gestion du code PIN
function PinSettings() {
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
    if (pin !== confirmPin) { a.setError('Les deux PIN ne correspondent pas'); return; }
    if (!/^\d{4}$/.test(pin)) { a.setError('Le PIN doit comporter 4 chiffres'); return; }
    if (await a.run(() => api('/auth/pin/set', { method: 'POST', body: { pin, password } }), 'Code PIN enregistré')) {
      reset(); load();
    }
  };

  const submitRemove = async (e) => {
    e.preventDefault();
    if (await a.run(() => api('/auth/pin/remove', { method: 'POST', body: { password } }), 'Code PIN désactivé')) {
      reset(); load();
    }
  };

  if (status === null) return <p className="mut sm">Chargement…</p>;

  if (mode === null) {
    return (
      <>
        <p className="mt">Statut : {status.hasPin ? <Badge v="active" /> : <Badge v="pending" />}</p>
        {status.locked && <Msg kind="err">PIN temporairement verrouillé jusqu'à {fdatetime(status.lockedUntil)}</Msg>}
        <div className="row mt" style={{ gap: '.5rem' }}>
          {status.hasPin ? (
            <>
              <button className="btn" onClick={() => setMode('set')}>Modifier le PIN</button>
              <button className="btn danger" onClick={() => setMode('remove')}>Désactiver</button>
            </>
          ) : (
            <button className="btn" onClick={() => setMode('set')}>Définir un code PIN</button>
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
        <label>Nouveau code PIN</label>
        <input type="password" inputMode="numeric" maxLength={4} pattern="\d{4}" required value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoComplete="off" />
        <label>Confirmer le code PIN</label>
        <input type="password" inputMode="numeric" maxLength={4} pattern="\d{4}" required value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoComplete="off" />
        <label>Mot de passe (pour confirmer)</label>
        <input type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
        <div className="row mt" style={{ gap: '.5rem' }}>
          <button type="button" className="btn ghost" onClick={reset}>Annuler</button>
          <button className="btn" disabled={a.busy || pin.length !== 4 || confirmPin.length !== 4}>
            {a.busy ? '…' : 'Enregistrer le PIN'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitRemove}>
      <p className="mut sm">Pour désactiver le PIN, saisissez votre mot de passe.</p>
      <label>Mot de passe</label>
      <input type="password" required value={password}
        onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      <Msg>{a.error}</Msg>
      <div className="row mt" style={{ gap: '.5rem' }}>
        <button type="button" className="btn ghost" onClick={reset}>Annuler</button>
        <button className="btn danger" disabled={a.busy}>Désactiver le PIN</button>
      </div>
    </form>
  );
}

// ✅ Gestion de la 2FA
function TwoFASettings() {
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
    const r = await a.run(() => api('/auth/2fa/enable', { method: 'POST', body: { code } }), '2FA activée');
    if (r) { setBackupCodes(r.data.backupCodes); setMode('backup-codes'); await refresh(); }
  };

  const disable = async (e) => {
    e.preventDefault();
    if (await a.run(() => api('/auth/2fa/disable', { method: 'POST', body: { password } }), '2FA désactivée')) {
      reset(); load(); await refresh();
    }
  };

  if (status === null) return <p className="mut sm">Chargement…</p>;

  if (mode === null) {
    return (
      <>
        <p className="mut sm">
          La 2FA ajoute une couche de sécurité supplémentaire. Après votre mot de passe, un code à 6 chiffres
          généré par votre téléphone sera demandé.
        </p>
        <p className="mt">
          Statut : {status.enabled ? <Badge v="active" /> : <Badge v="pending" />}
        </p>
        {status.enabled && status.backupCodesRemaining !== undefined && (
          <p className="mut sm">🔑 {status.backupCodesRemaining} code{status.backupCodesRemaining > 1 ? 's' : ''} de secours restant{status.backupCodesRemaining > 1 ? 's' : ''}</p>
        )}

        <div className="row mt" style={{ gap: '.5rem' }}>
          {status.enabled ? (
            <button className="btn danger" onClick={() => setMode('disable')}>Désactiver la 2FA</button>
          ) : (
            <button className="btn" onClick={startSetup} disabled={a.busy}>
              <Icons.Key size={16} /> Activer la 2FA
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
        <h4>1. Scannez ce QR code</h4>
        <p className="mut sm">Avec Google Authenticator, Authy, ou Microsoft Authenticator.</p>
        <div style={{ textAlign: 'center', margin: '1rem 0' }}>
          <img src={setup.qrCode} alt="QR Code 2FA" style={{ maxWidth: 240, borderRadius: 12, background: '#fff', padding: 8 }} />
        </div>

        <details style={{ marginBottom: '1rem' }}>
          <summary className="mut sm" style={{ cursor: 'pointer' }}>Ou saisissez le code manuellement</summary>
          <code style={{ display: 'block', marginTop: '.5rem', padding: '.6rem', background: 'rgba(0,0,0,.3)', borderRadius: 8, wordBreak: 'break-all', fontSize: '.85rem' }}>
            {setup.secret}
          </code>
        </details>

        <h4>2. Entrez le code affiché par l'application</h4>
        <input
          type="text" inputMode="numeric" maxLength={6} pattern="\d{6}"
          required value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          style={{ fontSize: '1.3rem', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700 }}
          autoFocus
        />

        <Msg>{a.error}</Msg>
        <div className="row mt" style={{ gap: '.5rem' }}>
          <button type="button" className="btn ghost" onClick={reset}>Annuler</button>
          <button className="btn" disabled={a.busy || code.length !== 6}>Valider et activer</button>
        </div>
      </form>
    );
  }

  if (mode === 'backup-codes') {
    return (
      <>
        <h4>✅ 2FA activée !</h4>
        <Msg kind="ok">Conservez ces codes de secours en lieu sûr. Ils ne seront plus jamais affichés.</Msg>
        <p className="mut sm">En cas de perte de votre téléphone, chaque code permet une connexion (usage unique).</p>

        <div className="backup-codes-grid">
          {backupCodes.map((c, i) => (
            <code key={i} className="backup-code">{c}</code>
          ))}
        </div>

        <button className="btn mt" onClick={async () => {
          try {
            await navigator.clipboard.writeText(backupCodes.join('\n'));
            a.setInfo('Codes copiés dans le presse-papier');
          } catch { /* ignore */ }
        }}>
          <Icons.Copy size={16} /> Copier tous les codes
        </button>

        <button className="btn ghost mt" onClick={() => { reset(); load(); }} style={{ width: '100%' }}>
          J'ai noté mes codes, fermer
        </button>
      </>
    );
  }

  return (
    <form onSubmit={disable}>
      <p className="mut sm">Pour désactiver la 2FA, saisissez votre mot de passe.</p>
      <label>Mot de passe</label>
      <input type="password" required value={password}
        onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      <Msg>{a.error}</Msg>
      <div className="row mt" style={{ gap: '.5rem' }}>
        <button type="button" className="btn ghost" onClick={reset}>Annuler</button>
        <button className="btn danger" disabled={a.busy}>Désactiver</button>
      </div>
    </form>
  );
}

// ✅ Historique des connexions
function LoginHistory() {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], meta: null });

  useEffect(() => {
    api(`/auth/login-history${qs({ page, limit: 10 })}`)
      .then(setRes)
      .catch(() => {});
  }, [page]);

  if (!res.data.length) return <p className="mut sm">Aucune connexion enregistrée pour le moment.</p>;

  const fmtUA = (ua) => {
    if (!ua) return 'Appareil inconnu';
    if (/mobile/i.test(ua)) return '📱 Mobile';
    if (/tablet|ipad/i.test(ua)) return '📱 Tablette';
    return '💻 Ordinateur';
  };

  return (
    <>
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Date</th><th>Appareil</th><th>IP</th><th>Résultat</th></tr>
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

// ✅ ADMINISTRATION
export function Admin() {
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
      toast('Utilisateur supprimé', 'success');
      setTick(tick + 1);
    }
  };

  const openUserTontines = async (u) => {
    try {
      const r = await api(`/admin/users/${u.id}/tontines`);
      setUserTontines(r.data);
    } catch (e) {
      toast(e.message || 'Erreur', 'error');
    }
  };

  return (
    <>
      <h1>Administration</h1>

      {stats && (
        <div className="grid g4 mt">
          {[
            ['Utilisateurs actifs', stats.users],
            ['Tontines actives', stats.activeTontines],
            ['Transactions validées', stats.validatedTransactions],
            ['Incidents (24 h)', stats.failures24h],
          ].map(([l, v]) => (
            <Tilt key={l} className="stat"><b>{v}</b><span>{l}</span></Tilt>
          ))}
        </div>
      )}

      <div className="card mt">
        <div className="row between">
          <h3>Utilisateurs</h3>
          <div className="row" style={{ gap: '.5rem' }}>
            <input
              style={{ maxWidth: 240 }}
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setUp(1); }}
            />
            <button className="btn" onClick={() => setShowCreate(true)}>
              + Créer un utilisateur
            </button>
          </div>
        </div>
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th /></tr>
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
                      <button className="btn ghost sm" onClick={() => openUserTontines(u)}>Tontines</button>
                      <button className="btn ghost sm" onClick={() => patch(u.id, { status: u.status === 'active' ? 'disabled' : 'active' })}>
                        {u.status === 'active' ? 'Désactiver' : 'Réactiver'}
                      </button>
                      <button className="btn ghost sm" onClick={() => patch(u.id, { role: u.role === 'admin' ? 'member' : 'admin' })}>
                        {u.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}
                      </button>
                      <button
                        className="btn ghost sm"
                        onClick={() => setConfirmDelete(u)}
                        title="Supprimer"
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
        <h3>Journal d'audit</h3>
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Ressource</th><th>Résultat</th><th>IP</th></tr>
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
        title="Supprimer cet utilisateur ?"
        message={confirmDelete ? `« ${confirmDelete.fullName} » sera anonymisé. Cette action est irréversible.` : ''}
        confirmText="Supprimer"
        cancelText="Annuler"
        danger
        onConfirm={() => removeUser(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

function CreateUserModal({ onClose, onCreated }) {
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
        <h3>Créer un utilisateur</h3>
        <p className="mut sm">Un mot de passe sécurisé sera généré automatiquement.</p>
        <form onSubmit={submit}>
          <label>Nom complet *</label>
          <input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoFocus />
          <label>Email *</label>
          <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <label>Téléphone (facultatif)</label>
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+229 ..." />
          <label>Rôle</label>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="member">Membre</option>
            <option value="admin">Administrateur</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '1rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.sendEmail} onChange={(e) => setF({ ...f, sendEmail: e.target.checked })} style={{ width: 'auto', minHeight: 'auto' }} />
            <span>Envoyer les identifiants par email</span>
          </label>
          <Msg>{a.error}</Msg>
          <div className="row between mt" style={{ gap: '.6rem' }}>
            <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
            <button className="btn" disabled={a.busy}>{a.busy ? 'Création…' : 'Créer le compte'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatedUserModal({ data, onClose }) {
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
        <h3>✅ Compte créé</h3>
        {data.emailSent ? (
          <Msg kind="ok">Un email a été envoyé à <b>{data.user.email}</b> avec les identifiants.</Msg>
        ) : (
          <Msg kind="err">L'email n'a pas pu être envoyé{data.emailError ? ` (${data.emailError})` : ''}. Communiquez ces identifiants manuellement.</Msg>
        )}
        <div className="card" style={{ background: 'rgba(0,0,0,.3)', marginTop: '1rem' }}>
          <div className="sm mut">Email</div>
          <div style={{ wordBreak: 'break-all' }}><b>{data.user.email}</b></div>
          <div className="sm mut mt">Mot de passe temporaire</div>
          <div className="row between" style={{ gap: '.5rem' }}>
            <code style={{ background: 'rgba(242,182,50,.15)', padding: '.4rem .7rem', borderRadius: 8, fontSize: '1rem', color: 'var(--gold2)', letterSpacing: '0.05em', flex: 1, wordBreak: 'break-all' }}>
              {data.generatedPassword}
            </code>
            <button className="btn sm" onClick={copy}>{copied ? '✓ Copié' : 'Copier'}</button>
          </div>
        </div>
        <p className="mut sm mt">💡 Le membre pourra changer son mot de passe dans <b>Paramètres</b> après sa première connexion.</p>
        <button className="btn mt" onClick={onClose} style={{ width: '100%' }}>Fermer</button>
      </div>
    </div>
  );
}

function UserTontinesModal({ data, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h3>Tontines de {data.user.fullName}</h3>
        <p className="mut sm">{data.user.email}</p>
        {data.tontines.length === 0 ? (
          <p className="mut mt">Cet utilisateur ne participe à aucune tontine.</p>
        ) : (
          <div className="scroll mt" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr><th>Tontine</th><th>Rôle</th><th>Cotisation</th><th>Progression</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {data.tontines.map((t) => (
                  <tr key={t.id}>
                    <td><b>{t.name}</b></td>
                    <td><Badge v={t.role} /></td>
                    <td>{money(t.contributionAmount, t.currency)}</td>
                    <td className="sm mut">{t.roundsDone}/{t.roundsTotal} tours</td>
                    <td><Badge v={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button className="btn mt" onClick={onClose} style={{ width: '100%' }}>Fermer</button>
      </div>
    </div>
  );
}