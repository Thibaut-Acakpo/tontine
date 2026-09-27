import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Coin3D, Reveal, Tilt } from '../components/Fx.jsx';
import { Msg, useAction } from '../components/ui.jsx';

// ============================================================
// NAVIGATION PUBLIQUE
// ============================================================
export function PublicNav() {
  const { user } = useAuth();
  return (
    <nav className="pubnav">
      <Link to="/" className="brand"><i>₣</i> Tontine</Link>
      <div className="row">
        {user
          ? <Link className="btn" to="/app">Mon espace</Link>
          : <Link className="btn" to="/connexion">Connexion</Link>}
      </div>
    </nav>
  );
}

// ============================================================
// PAGE D'ACCUEIL — Refonte complète
// ============================================================
export function Home() {
  return (
    <div className="pub">
      <PublicNav />

      {/* ============ 1. HERO ============ */}
      <section className="hero">
        <div>
          <h1>
            Votre tontine,<br />
            <span className="gold">transparente</span> et sécurisée.
          </h1>
          <p>
            Organisez les tours, suivez chaque cotisation et versez les bénéficiaires
            en toute confiance. Fini les cahiers et les malentendus.
          </p>
          <div className="row mt" style={{ gap: '.6rem' }}>
            <Link className="btn" to="/connexion">Accéder à mon espace</Link>
            <a className="btn ghost" href="#how-it-works">Comment ça marche ?</a>
          </div>
        </div>
        <Coin3D />
      </section>

      {/* ============ 2. CHIFFRES CLÉS ============ */}
      <section className="landing-stats">
        {[
          ['100%', 'Sécurisé', 'Chiffrement des données & 2FA'],
          ['0', 'Cahier papier', 'Tout est digital et traçable'],
          ['24/7', 'Accessible', 'Sur mobile, tablette et ordinateur'],
          ['∞', 'Tontines', 'Créez-en autant que vous voulez'],
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

      {/* ============ 3. FONCTIONNALITÉS ============ */}
      <section className="landing-section">
        <div className="landing-head">
          <h2>Tout ce qu'il faut pour gérer vos tontines</h2>
          <p className="mut">
            Des outils simples et puissants pour remplacer le cahier papier et éviter les erreurs.
          </p>
        </div>
        <div className="features">
          {[
            { icon: '📊', title: 'Cotisations claires', desc: 'Montants, fréquence et ordre des bénéficiaires définis une fois pour toutes. Plus de calculs à refaire.' },
            { icon: '🔒', title: 'Livre de comptes inviolable', desc: 'Chaque opération a un numéro unique. Toute correction est tracée. Impossible de falsifier.' },
            { icon: '💳', title: 'Paiements sécurisés', desc: 'Montants vérifiés côté serveur, protection contre les doubles paiements. Mobile money et espèces.' },
            { icon: '👥', title: 'Rôles maîtrisés', desc: 'Administrateur, gestionnaire, trésorier, membre : chacun ses droits et ses responsabilités.' },
            { icon: '🔔', title: 'Notifications automatiques', desc: 'Rappels d\'échéance, confirmations de paiement, versements. Tout le monde est prévenu.' },
            { icon: '📱', title: 'Accessible partout', desc: 'Sur mobile, tablette et ordinateur. Fonctionne même avec une connexion lente.' },
          ].map(({ icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 60}>
              <Tilt>
                <div className="feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p className="mut">{desc}</p>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 4. COMMENT ÇA MARCHE ============ */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-head">
          <h2>Comment ça marche ?</h2>
          <p className="mut">4 étapes simples pour digitaliser votre tontine.</p>
        </div>
        <div className="steps-grid">
          {[
            { n: '1', title: 'Créez votre tontine', desc: 'Définissez le montant, la fréquence et la date de début. En 30 secondes.' },
            { n: '2', title: 'Invitez vos membres', desc: 'Ajoutez les participants par email. Ils reçoivent une invitation automatique.' },
            { n: '3', title: 'Suivez les cotisations', desc: 'Chaque membre paie en ligne ou en espèces. Tout est enregistré automatiquement.' },
            { n: '4', title: 'Versez les bénéficiaires', desc: 'À chaque tour, versez la cagnotte au bénéficiaire désigné. C\'est tracé.' },
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

      {/* ============ 5. CTA FINAL ============ */}
      <section className="landing-cta">
        <Reveal>
          <div className="cta-card">
            <h2>Prêt à digitaliser votre tontine ?</h2>
            <p className="mut">
              Connectez-vous pour créer votre première tontine, ou demandez à votre gestionnaire
              de vous ajouter à une tontine existante.
            </p>
            <div className="row" style={{ justifyContent: 'center', gap: '.6rem', marginTop: '1.5rem' }}>
              <Link className="btn" to="/connexion">Accéder à mon espace</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ 6. FOOTER ============ */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: '.8rem' }}><i>₣</i> Tontine</div>
            <p className="mut sm" style={{ maxWidth: 320 }}>
              La plateforme qui digitalise les tontines pour plus de transparence et de confiance.
            </p>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><a href="#how-it-works">Comment ça marche</a></li>
              <li><Link to="/connexion">Connexion</Link></li>
            </ul>
          </div>
          <div>
            <h4>Légal</h4>
            <ul>
              <li><Link to="/confidentialite">Confidentialité</Link></li>
              <li><Link to="/cgu">CGU</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:contact@tontine.app">contact@tontine.app</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="mut sm">© {new Date().getFullYear()} Tontine · Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Shell public (utilisé par les pages Login/Register/etc.)
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
// INSCRIPTION
// ============================================================
export function Register() {
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [done, setDone] = useState(false);
  const a = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const body = { ...f };
    if (!body.phone) delete body.phone;
    if (await a.run(() => api('/auth/register', { method: 'POST', body }))) setDone(true);
  };
  if (done) return <Shell title="Vérifiez votre boîte mail"><Msg kind="ok">Si les informations sont valides, un email de confirmation vient d'être envoyé. Cliquez sur le lien pour activer votre compte.</Msg><Link to="/connexion">Aller à la connexion</Link></Shell>;
  return (
    <Shell title="Créer un compte">
      <form onSubmit={submit}>
        <label>Nom complet</label><input required value={f.fullName} onChange={set('fullName')} autoComplete="name" />
        <label>Email</label><input required type="email" value={f.email} onChange={set('email')} autoComplete="email" />
        <label>Téléphone (facultatif)</label><input value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+229 ..." />
        <label>Mot de passe (10 caractères min.)</label><input required type="password" minLength={10} value={f.password} onChange={set('password')} autoComplete="new-password" />
        <Msg>{a.error}</Msg><button className="btn mt" disabled={a.busy}>{a.busy ? '…' : 'Créer mon compte'}</button>
      </form>
      <p className="mut sm mt">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></p>
    </Shell>
  );
}

// ============================================================
// CONNEXION
// ============================================================
export function Login() {
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
    <Shell title="Connexion">
      <form onSubmit={submit}>
        <label>Email</label><input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
        <label>Mot de passe</label><input required type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
        <Msg>{a.error}</Msg><button className="btn mt" disabled={a.busy}>{a.busy ? '…' : 'Se connecter'}</button>
      </form>
      <p className="mut sm mt"><Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link></p>
    </Shell>
  );
}

// ============================================================
// MOT DE PASSE OUBLIÉ
// ============================================================
export function Forgot() {
  const [email, setEmail] = useState('');
  const a = useAction();
  return (
    <Shell title="Mot de passe oublié">
      <form onSubmit={(e) => { e.preventDefault(); a.run(() => api('/auth/forgot-password', { method: 'POST', body: { email } }), 'Si l\'adresse est valide, un email vous a été envoyé.'); }}>
        <label>Email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Msg>{a.error}</Msg><Msg kind="ok">{a.info}</Msg><button className="btn mt" disabled={a.busy}>Envoyer le lien</button>
      </form>
    </Shell>
  );
}

// ============================================================
// RÉINITIALISATION MOT DE PASSE
// ============================================================
export function Reset() {
  const [p] = useSearchParams();
  const [password, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const a = useAction();
  const nav = useNavigate();
  const token = p.get('token') || '';

  const rules = [
    { k: 'len', ok: password.length >= 10, label: 'Au moins 10 caractères' },
    { k: 'up', ok: /[A-Z]/.test(password), label: 'Une majuscule' },
    { k: 'low', ok: /[a-z]/.test(password), label: 'Une minuscule' },
    { k: 'num', ok: /[0-9]/.test(password), label: 'Un chiffre' },
  ];
  const passed = rules.filter((r) => r.ok).length;
  const strength = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][passed];
  const strengthClass = ['', 'red', 'gold', 'em', 'em'][passed];
  const match = password && confirm && password === confirm;
  const canSubmit = passed === 4 && match && !a.busy;

  if (!token) {
    return (
      <Shell title="Lien invalide">
        <Msg kind="err">Le lien est incomplet ou invalide. Refaites une demande de réinitialisation.</Msg>
        <Link className="btn mt" to="/mot-de-passe-oublie">Recommencer</Link>
      </Shell>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (await a.run(() => api('/auth/reset-password', { method: 'POST', body: { token, password } }), 'Mot de passe modifié.')) {
      setTimeout(() => nav('/connexion'), 1500);
    }
  };

  return (
    <Shell title="Nouveau mot de passe">
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        Choisissez un mot de passe sécurisé. Après validation, vous serez redirigé vers la page de connexion.
      </p>

      <form onSubmit={submit}>
        <label>Nouveau mot de passe</label>
        <div className="pw-wrap">
          <input required type={show ? 'text' : 'password'} value={password} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
          <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? 'Masquer' : 'Afficher'}>
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

        <label>Confirmer le mot de passe</label>
        <div className="pw-wrap">
          <input required type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
        {confirm && !match && <p className="sm pw-mismatch">Les deux mots de passe ne correspondent pas.</p>}
        {confirm && match && <p className="sm pw-match">✓ Les mots de passe correspondent</p>}

        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>

        <button className="btn mt" disabled={!canSubmit}>
          {a.busy ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
        </button>
      </form>
    </Shell>
  );
}

// ============================================================
// VÉRIFICATION EMAIL
// ============================================================
export function VerifyEmail() {
  const [p] = useSearchParams();
  const [state, setState] = useState({ msg: 'Vérification en cours…', ok: null });
  useEffect(() => {
    api('/auth/verify-email', { method: 'POST', body: { token: p.get('token') || '' } })
      .then(() => setState({ msg: 'Adresse confirmée, vous pouvez vous connecter.', ok: true }))
      .catch((e) => setState({ msg: e.message, ok: false }));
  }, [p]);
  return (
    <Shell title="Confirmation de l'email">
      <Msg kind={state.ok === false ? 'err' : 'ok'}>{state.msg}</Msg>
      {state.ok && <Link className="btn" to="/connexion">Se connecter</Link>}
    </Shell>
  );
}

// ============================================================
// VÉRIFICATION PIN
// ============================================================
export function VerifyPin() {
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
    <Shell title="Code PIN">
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        Saisissez votre code PIN à 4 chiffres pour accéder à votre espace.
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

        {busy && <p className="mut sm" style={{ textAlign: 'center' }}>Vérification…</p>}
        <Msg>{error}</Msg>

        <p className="mut sm mt" style={{ textAlign: 'center' }}>
          <Link to="/connexion">Utiliser un autre compte</Link>
        </p>
      </form>
    </Shell>
  );
}

// ============================================================
// VÉRIFICATION 2FA
// ============================================================
export function Verify2FA() {
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
    <Shell title="Vérification 2FA">
      <p className="mut sm" style={{ marginTop: '-.3rem', marginBottom: '1rem' }}>
        {useBackup
          ? "Entrez un code de secours (format XXXX-XXXX). Chaque code ne peut être utilisé qu'une fois."
          : "Ouvrez votre application d'authentification et entrez le code à 6 chiffres."}
      </p>

      <form onSubmit={submit}>
        <label>{useBackup ? 'Code de secours' : 'Code 2FA'}</label>
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
          {busy ? 'Vérification…' : 'Valider'}
        </button>

        <p className="mut sm mt" style={{ textAlign: 'center' }}>
          <button type="button" className="btn ghost sm" onClick={() => { setUseBackup(!useBackup); setCode(''); setError(''); }}>
            {useBackup ? '← Utiliser un code 2FA' : 'Utiliser un code de secours'}
          </button>
        </p>

        <p className="mut sm mt" style={{ textAlign: 'center' }}>
          <Link to="/connexion">Utiliser un autre compte</Link>
        </p>
      </form>
    </Shell>
  );
}