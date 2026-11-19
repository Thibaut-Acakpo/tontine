import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Reveal } from '../components/Fx.jsx';
import { Msg, useAction } from '../components/ui.jsx';
import { Icons } from '../components/Icons.jsx';
import { useTheme } from '../components/ThemeProvider.jsx';

// ============================================================
// NAVIGATION PUBLIQUE
// ============================================================
export function PublicNav() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const isAuthFlow = ['/pin', '/2fa'].includes(location.pathname);
  const isLogin = location.pathname === '/connexion';

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <nav className="pubnav">
      <Link to="/" className="brand"><i>₣</i> Tontine</Link>
      <div className="row" style={{ gap: '.5rem', alignItems: 'center' }}>
        {/* Sélecteur de langue */}
        <select
          className="lang-select"
          value={i18n.language?.split('-')[0] || 'fr'}
          onChange={(e) => changeLanguage(e.target.value)}
          aria-label="Changer de langue"
        >
          <option value="fr">🇫🇷 FR</option>
          <option value="en">🇬🇧 EN</option>
        </select>

        {/* Toggle de thème (clair/sombre) */}
        <button
          className="theme-toggle-public"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          aria-label="Changer de thème"
        >
          {theme === 'dark' ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
        </button>

        {/* Bouton Connexion / Mon espace */}
        {user && !isAuthFlow && (
          <Link className="btn" to="/app">{t('auth.mySpace')}</Link>
        )}
        {!user && (
          <Link className="btn" to={isLogin ? '/' : '/connexion'}>
            {isLogin ? t('common.back') : t('auth.login')}
          </Link>
        )}
      </div>
    </nav>
  );
}

// ============================================================
// Shell
// ============================================================
const Shell = ({ title, children }) => (
  <div className="pub">
    <PublicNav />
    <Reveal>
      <div className="card auth">
        <div className="auth-mark" aria-hidden="true">₣</div>
        <h2>{title}</h2>
        {children}
      </div>
    </Reveal>
  </div>
);

// ============================================================
// INSCRIPTION PAR TOKEN
// ============================================================
export function Register() {
  const { t } = useTranslation();
  const [p] = useSearchParams();
  const token = p.get('token');
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [done, setDone] = useState(false);
  const a = useAction();

  if (!token) {
    return (
      <Shell title={t('auth.invitationRequired')}>
        <Msg kind="err">{t('auth.invitationRequiredDesc')}</Msg>
        <p className="mut sm mt">
          {t('auth.alreadyRegistered')} <Link to="/connexion">{t('auth.loginBtn')}</Link>
        </p>
      </Shell>
    );
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const body = { token, ...f };
    if (!body.phone) delete body.phone;
    if (await a.run(() => api('/auth/register-invited', { method: 'POST', body }))) {
      setDone(true);
    }
  };

  if (done) {
    return (
      <Shell title={t('auth.accountCreated')}>
        <Msg kind="ok">{t('auth.accountCreatedDesc')}</Msg>
        <Link className="btn mt" to="/connexion">{t('auth.loginBtn')}</Link>
      </Shell>
    );
  }

  return (
    <Shell title={t('auth.createMyAccount')}>
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        {t('auth.invitedDesc')}
      </p>
      <form onSubmit={submit}>
        <label>{t('auth.fullName')} *</label>
        <input required value={f.fullName} onChange={set('fullName')} autoComplete="name" />
        <label>{t('auth.email')} *</label>
        <input required type="email" value={f.email} onChange={set('email')} autoComplete="email"
          placeholder={t('auth.emailPlaceholder')} />
        <label>{t('auth.phone')} ({t('common.optional')})</label>
        <input value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder={t('auth.phonePlaceholder')} />
        <label>{t('auth.password')} * ({t('auth.passwordHint')})</label>
        <input required type="password" minLength={10} value={f.password} onChange={set('password')} autoComplete="new-password" />
        <Msg>{a.error}</Msg>
        <button className="btn mt" disabled={a.busy}>{a.busy ? '…' : t('auth.createMyAccount')}</button>
      </form>
      <p className="mut sm mt">
        {t('auth.alreadyRegistered')} <Link to="/connexion">{t('auth.loginBtn')}</Link>
      </p>
    </Shell>
  );
}

// ============================================================
// CONNEXION
// ============================================================
export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const a = useAction();
  const [f, setF] = useState({ email: '', password: '' });
  const submit = async (e) => {
    e.preventDefault();
    await a.run(async () => {
      const r = await login(f.email, f.password);
      if (r?.requires2FA) {
        nav('/2fa', { state: { preAuthToken: r.preAuthToken } });
      } else if (r?.requiresPin) {
        nav('/pin');
      } else {
        nav('/app');
      }
    });
  };
  return (
    <Shell title={t('auth.login')}>
      <form onSubmit={submit}>
        <label>{t('auth.email')}</label>
        <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        <label>{t('auth.password')}</label>
        <input required type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
        <Msg>{a.error}</Msg>
        <button className="btn mt" disabled={a.busy}>{a.busy ? '…' : t('auth.loginBtn')}</button>
      </form>
      <p className="mut sm mt auth-forgot-link"><Link to="/mot-de-passe-oublie">{t('auth.forgotPassword')}</Link></p>
    </Shell>
  );
}

// ============================================================
// MOT DE PASSE OUBLIÉ
// ============================================================
export function Forgot() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const a = useAction();
  return (
    <Shell title={t('auth.forgotPasswordTitle')}>
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        {t('auth.forgotPasswordDesc')}
      </p>
      <form onSubmit={(e) => {
        e.preventDefault();
        a.run(
          () => api('/auth/forgot-password', { method: 'POST', body: { email } }),
          t('auth.forgotSuccess')
        );
      }}>
        <label>{t('auth.email')}</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
        <button className="btn mt" disabled={a.busy}>{t('auth.sendLink')}</button>
      </form>
    </Shell>
  );
}

// ============================================================
// RÉINITIALISATION
// ============================================================
export function Reset() {
  const { t } = useTranslation();
  const [p] = useSearchParams();
  const [password, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const a = useAction();
  const nav = useNavigate();
  const token = p.get('token') || '';

  const rules = [
    { k: 'len', ok: password.length >= 10, label: t('reset.rule.length') },
    { k: 'up', ok: /[A-Z]/.test(password), label: t('reset.rule.upper') },
    { k: 'low', ok: /[a-z]/.test(password), label: t('reset.rule.lower') },
    { k: 'num', ok: /[0-9]/.test(password), label: t('reset.rule.number') },
  ];
  const passed = rules.filter((r) => r.ok).length;
  const strength = [t('reset.strength.weak'), t('reset.strength.weak'), t('reset.strength.medium'), t('reset.strength.good'), t('reset.strength.strong')][passed];
  const strengthClass = ['', 'red', 'red', 'gold', 'em'][passed];
  const match = password && confirm && password === confirm;
  const canSubmit = passed === 4 && match && !a.busy;

  if (!token) {
    return (
      <Shell title={t('auth.invalidLink')}>
        <Msg kind="err">{t('auth.invalidLinkDesc')}</Msg>
        <Link className="btn mt" to="/mot-de-passe-oublie">{t('auth.restart')}</Link>
      </Shell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (await a.run(() => api('/auth/reset-password', { method: 'POST', body: { token, password } }), t('settings.passwordChanged'))) {
      setTimeout(() => nav('/connexion'), 1500);
    }
  };

  return (
    <Shell title={t('auth.resetPasswordTitle')}>
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        {t('auth.resetPasswordDesc')}
      </p>

      <form onSubmit={submit}>
        <label>{t('auth.newPassword')}</label>
        <div className="pw-wrap">
          <input required type={show ? 'text' : 'password'} value={password}
            onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
          <button type="button" className="pw-toggle" onClick={() => setShow(!show)}>
            {show ? '🙈' : '👁'}
          </button>
        </div>

        {password && (
          <div className="pw-strength">
            <div className="pw-bars">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`pw-bar ${i <= passed ? 'on ' + strengthClass : ''}`} />
              ))}
            </div>
            <span className={`sm pw-label ${strengthClass}`}>{strength}</span>
          </div>
        )}

        {password && (
          <ul className="pw-rules sm">
            {rules.map((r) => (
              <li key={r.k} className={r.ok ? 'ok' : ''}>{r.ok ? '✓' : '○'} {r.label}</li>
            ))}
          </ul>
        )}

        <label>{t('auth.confirmPassword')}</label>
        <div className="pw-wrap">
          <input required type={show ? 'text' : 'password'} value={confirm}
            onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        {confirm && !match && <p className="sm pw-mismatch">{t('auth.passwordMismatch')}</p>}
        {confirm && match && <p className="sm pw-match">{t('auth.passwordMatch')}</p>}

        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>

        <button className="btn mt" disabled={!canSubmit}>
          {a.busy ? t('auth.saving') : t('auth.savePassword')}
        </button>
      </form>
    </Shell>
  );
}

// ============================================================
// VÉRIFICATION EMAIL
// ============================================================
export function VerifyEmail() {
  const { t } = useTranslation();
  const [p] = useSearchParams();
  const [state, setState] = useState({ msg: t('auth.verifying'), ok: null });
  useEffect(() => {
    api('/auth/verify-email', { method: 'POST', body: { token: p.get('token') || '' } })
      .then(() => setState({ msg: t('auth.emailConfirmed'), ok: true }))
      .catch((e) => setState({ msg: e.message, ok: false }));
  }, [p, t]);
  return (
    <Shell title={t('auth.emailVerified')}>
      <Msg kind={state.ok === false ? 'err' : 'ok'}>{state.msg}</Msg>
      {state.ok && <Link className="btn" to="/connexion">{t('auth.loginBtn')}</Link>}
    </Shell>
  );
}

// ============================================================
// VÉRIFICATION PIN
// ============================================================
export function VerifyPin() {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const verify = async (value) => {
    setBusy(true); setError('');
    try {
      await api('/auth/pin/verify', { method: 'POST', body: { pin: value } });
      nav('/app');
    } catch (err) {
      setError(err.message);
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (e) => {
    if (busy) return;
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    if (digits.length === 4) verify(digits);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length === 4 && !busy) verify(pin);
  };

  return (
    <Shell title={t('auth.pinTitle')}>
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        {t('auth.pinDesc')}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="pin-display" style={{ display: 'flex', justifyContent: 'center', gap: '.8rem', margin: '1.5rem 0', position: 'relative' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              width: 48, height: 56, borderRadius: 12,
              border: '2px solid var(--line)',
              display: 'grid', placeItems: 'center',
              fontSize: '1.6rem', fontWeight: 800,
              background: pin.length === i ? 'rgba(242,182,50,.15)' : 'transparent',
              color: 'var(--gold2)',
              transition: 'background .2s, border-color .2s',
              borderColor: pin.length === i ? 'var(--gold)' : 'var(--line)',
              opacity: busy ? 0.6 : 1,
            }}>
              {pin.length > i ? '•' : ''}
            </div>
          ))}
          <input
            type="text" inputMode="numeric" pattern="\d*" maxLength={4}
            value={pin} onChange={handleChange} autoFocus autoComplete="off" disabled={busy}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'text', fontSize: '16px' }}
          />
        </div>

        {busy && <p className="mut sm" style={{ textAlign: 'center' }}>{t('auth.verifying')}</p>}
        <Msg>{error}</Msg>

        <p className="mut sm mt" style={{ textAlign: 'center' }}>
          <Link to="/connexion">{t('auth.otherAccount')}</Link>
        </p>
      </form>
    </Shell>
  );
}

// ============================================================
// VÉRIFICATION 2FA
// ============================================================
export function Verify2FA() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const preAuthToken = loc.state?.preAuthToken;

  useEffect(() => {
    if (!preAuthToken) nav('/connexion', { replace: true });
  }, [preAuthToken, nav]);

  const submit = async (e) => {
    e.preventDefault();
    if (!code) return;
    setBusy(true); setError('');
    try {
      const r = await api('/auth/2fa/verify', { method: 'POST', body: { preAuthToken, code } });
      if (r.data.requiresPin) nav('/pin');
      else nav('/app');
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={t('auth.2faTitle')}>
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        {useBackup ? t('auth.2faBackupDesc') : t('auth.2faDesc')}
      </p>

      <form onSubmit={submit}>
        <label>{useBackup ? t('auth.backupCode') : t('auth.2faCode')}</label>
        <input
          type="text"
          inputMode={useBackup ? 'text' : 'numeric'}
          autoFocus
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={useBackup ? 'XXXX-XXXX' : '123456'}
          maxLength={useBackup ? 9 : 6}
          style={{ fontSize: '1.3rem', letterSpacing: '0.2em', textAlign: 'center', fontWeight: 700 }}
        />

        <Msg>{error}</Msg>

        <button className="btn mt" disabled={busy || !code} style={{ width: '100%' }}>
          {busy ? t('auth.verifying') : t('auth.validate')}
        </button>

        <p className="mut sm mt" style={{ textAlign: 'center' }}>
          <button type="button" className="btn ghost sm" onClick={() => { setUseBackup(!useBackup); setCode(''); setError(''); }}>
            {useBackup ? t('auth.use2fa') : t('auth.useBackup')}
          </button>
        </p>

        <p className="mut sm mt" style={{ textAlign: 'center' }}>
          <Link to="/connexion">{t('auth.otherAccount')}</Link>
        </p>
      </form>
    </Shell>
  );
}