import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Coin3D, Reveal, Tilt } from '../components/Fx.jsx';
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
          <Link className="btn" to="/connexion">{t('auth.login')}</Link>
        )}
      </div>
    </nav>
  );
}

// ============================================================
// PAGE D'ACCUEIL
// ============================================================
export function Home() {
  const { t } = useTranslation();
  return (
    <div className="pub">
      <PublicNav />

      {/* 1. HERO */}
      <section className="hero">
        <div>
          <h1>
            {t('home.heroTitle')}<br />
            <span className="gold">{t('home.heroHighlight')}</span> {t('home.heroEnd')}
          </h1>
          <p>{t('home.heroDesc')}</p>
          <div className="row mt" style={{ gap: '.6rem' }}>
            <Link className="btn cta-btn" to="/connexion">{t('home.accessSpace')}</Link>
            <a className="btn ghost" href="#how-it-works">{t('home.howItWorks')}</a>
            <a className="btn ghost" href="#contact">{t('contact.button')}</a>
          </div>
        </div>
        <Coin3D />
      </section>

      {/* 2. CHIFFRES CLÉS */}
      <section className="landing-stats">
        {[
          ['100%', t('home.stat1.label'), t('home.stat1.desc')],
          ['0', t('home.stat2.label'), t('home.stat2.desc')],
          ['24/7', t('home.stat3.label'), t('home.stat3.desc')],
          ['∞', t('home.stat4.label'), t('home.stat4.desc')],
        ].map(([v, l, d], i) => (
          <Reveal key={l} delay={i * 80}>
            <div className="landing-stat">
              <b>{v}</b>
              <span>{l}</span>
              <small className="mut">{d}</small>
            </div>
          </Reveal>
        ))}
      </section>

      {/* 3. FONCTIONNALITÉS */}
      <section className="landing-section">
        <div className="landing-head">
          <h2>{t('home.featuresTitle')}</h2>
          <p className="mut">{t('home.featuresDesc')}</p>
        </div>
        <div className="features">
          {[
            { Icon: Icons.Trending,      title: t('home.feat1.title'), desc: t('home.feat1.desc') },
            { Icon: Icons.Lock,          title: t('home.feat2.title'), desc: t('home.feat2.desc') },
            { Icon: Icons.Payments,      title: t('home.feat3.title'), desc: t('home.feat3.desc') },
            { Icon: Icons.Users,         title: t('home.feat4.title'), desc: t('home.feat4.desc') },
            { Icon: Icons.Notifications, title: t('home.feat5.title'), desc: t('home.feat5.desc') },
            { Icon: Icons.Phone,         title: t('home.feat6.title'), desc: t('home.feat6.desc') },
          ].map(({ Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 60}>
              <Tilt>
                <div className="feature-icon">
                  <Icon size={26} strokeWidth={1.8} />
                </div>
                <h3>{title}</h3>
                <p className="mut">{desc}</p>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 4. COMMENT ÇA MARCHE */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-head">
          <h2>{t('home.howTitle')}</h2>
          <p className="mut">{t('home.howDesc')}</p>
        </div>
        <div className="steps-grid">
          {[
            { n: '1', title: t('home.step1.title'), desc: t('home.step1.desc') },
            { n: '2', title: t('home.step2.title'), desc: t('home.step2.desc') },
            { n: '3', title: t('home.step3.title'), desc: t('home.step3.desc') },
            { n: '4', title: t('home.step4.title'), desc: t('home.step4.desc') },
          ].map(({ n, title, desc }, i) => (
            <Reveal key={n} delay={i * 80}>
              <div className="step-card">
                <div className="step-number">{n}</div>
                <h3>{title}</h3>
                <p className="mut">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. CTA FINAL */}
      <section className="landing-cta">
        <Reveal>
          <div className="cta-card">
            <h2>{t('home.ctaTitle')}</h2>
            <p className="mut">{t('home.ctaDesc')}</p>
            <div className="row" style={{ justifyContent: 'center', gap: '.6rem', marginTop: '1.5rem' }}>
              <Link className="btn cta-btn" to="/connexion">{t('home.accessSpace')}</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 5b. CONTACT */}
      <section className="landing-section contact-section" id="contact">
        <div className="landing-head">
          <h2>{t('contact.title')}</h2>
          <p className="mut">{t('contact.desc')}</p>
        </div>

        <Reveal>
          <div className="contact-grid">
            {/* Case 1 : Email */}
            <a className="contact-card" href="mailto:acakpothibaut2@gmail.com">
              <div className="contact-icon">
                <Icons.Mail size={32} strokeWidth={1.8} />
              </div>
              <div className="contact-label">{t('contact.email')}</div>
              <div className="contact-value">acakpothibaut2@gmail.com</div>
            </a>

            {/* Case 2 : WhatsApp + Appel */}
            <div className="contact-card contact-card-phone">
              <div className="contact-icon">
                <Icons.PhoneCall size={32} strokeWidth={1.8} />
              </div>
              <div className="contact-label">
                {t('contact.whatsapp')} &amp; {t('contact.call')}
              </div>
              <div className="contact-value">+229 01 99 91 14 38</div>

              <div className="contact-actions">
                <a
                  className="contact-action-btn wa"
                  href="https://wa.me/2290199911438?text=Bonjour%2C%20je%20souhaite%20g%C3%A9rer%20mes%20tontines%20avec%20Tontine."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icons.WhatsApp size={16} strokeWidth={2} />
                  WhatsApp
                </a>
                <a className="contact-action-btn call" href="tel:+2290199911438">
                  <Icons.PhoneCall size={16} strokeWidth={2} />
                  {t('contact.call')}
                </a>
              </div>
            </div>
          </div>

          <p className="mut sm" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            ⏱️ {t('contact.responseTime')}
          </p>
        </Reveal>
      </section>

      {/* 6. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: '.8rem' }}><i>₣</i> Tontine</div>
            <p className="mut sm" style={{ maxWidth: 320 }}>{t('home.footerTagline')}</p>
          </div>
          <div>
            <h4>{t('home.footerNav')}</h4>
            <ul>
              <li><a href="#how-it-works">{t('home.howItWorks')}</a></li>
              <li><a href="#contact">{t('contact.button')}</a></li>
              <li><Link to="/connexion">{t('auth.login')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('home.footerLegal')}</h4>
            <ul>
              <li><Link to="/confidentialite">{t('home.footerPrivacy')}</Link></li>
              <li><Link to="/cgu">{t('home.footerTerms')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('home.footerContact')}</h4>
            <ul>
              <li><a href="mailto:acakpothibaut2@gmail.com">acakpothibaut2@gmail.com</a></li>
              <li><a href="https://wa.me/2290199911438" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
              <li><a href="tel:+2290199911438">+229 01 99 91 14 38</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="mut sm">© {new Date().getFullYear()} Tontine · {t('home.footerRights')}</span>
        </div>
      </footer>
    </div>
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
      <p className="mut sm mt"><Link to="/mot-de-passe-oublie">{t('auth.forgotPassword')}</Link></p>
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