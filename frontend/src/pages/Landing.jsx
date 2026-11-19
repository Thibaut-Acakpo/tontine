import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, ArrowUpRight, Bell, Check, Coins, FileText, Fingerprint, KeyRound, Lock, Menu, Minus,
  Moon, Phone, Plus, ScrollText, ShieldCheck, Smartphone, Sun, Users, X, Database, ClipboardList, EyeOff, UserX,
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useTheme } from '../components/ThemeProvider.jsx';
import { Reveal } from '../components/Fx.jsx';
import { CONTACT, TESTIMONIALS } from '../landing/copy.js';
import '../landing/landing.css';

const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n, lang) => Number(n).toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR');
const listOf = (t, key) => { const v = t(key, { returnObjects: true }); return Array.isArray(v) ? v : []; };

// ------------------------------------------------------------
// Éléments communs
// ------------------------------------------------------------
function SectionHead({ kicker, title, sub, id, align = 'center' }) {
  return (
    <header className={`lp-head ${align === 'left' ? 'left' : ''}`}>
      <p className="lp-kicker">{kicker}</p>
      <h2 id={id}>{title}</h2>
      {sub && <p className="lp-sub">{sub}</p>}
    </header>
  );
}

function Logo() {
  return (
    <Link to="/" className="lp-logo" aria-label="Tontine">
      <span className="lp-logo-mark" aria-hidden="true">₣</span>
      <span>Tontine</span>
    </Link>
  );
}

// ------------------------------------------------------------
// Navigation
// ------------------------------------------------------------
function LandingNav() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const lang = i18n.language?.split('-')[0] || 'fr';
  const changeLang = (l) => { i18n.changeLanguage(l); localStorage.setItem('lang', l); };
  const links = [
    ['#fonctionnement', t('lp.nav.how')],
    ['#avantages', t('lp.nav.benefits')],
    ['#garanties', t('lp.nav.trust')],
    ['#offre', t('lp.nav.offer')],
    ['#faq', t('lp.nav.faq')],
  ];

  return (
    <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="lp-nav-inner">
        <Logo />
        <nav className="lp-links" aria-label={t('lp.nav.main')} id="lp-menu">
          {links.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <div className="lp-menu-tools">
            <select className="lp-select" value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Langue / Language">
              <option value="fr">FR</option>
              <option value="en">EN</option>
            </select>
            <button type="button" className="lp-icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            {user
              ? <Link className="lp-btn lp-btn-ghost lp-btn-sm" to="/app">{t('auth.mySpace')}</Link>
              : <Link className="lp-btn lp-btn-ghost lp-btn-sm" to="/connexion">{t('auth.login')}</Link>}
            <a className="lp-btn lp-btn-primary lp-btn-sm" href="#contact" onClick={() => setOpen(false)}>{t('lp.nav.contact')}</a>
          </div>
        </nav>
        <button
          ref={btnRef}
          type="button"
          className="lp-burger lp-icon-btn"
          aria-expanded={open}
          aria-controls="lp-menu"
          aria-label={open ? t('lp.nav.close') : t('lp.nav.menu')}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

// ------------------------------------------------------------
// Visuel principal : la cagnotte tourne de membre en membre
// ------------------------------------------------------------
const RING_N = 8;
const RING_POT = 80000;

function RotationVisual() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'fr';
  const [tick, setTick] = useState(2);
  const reduced = useMemo(prefersReducedMotion, []);

  useEffect(() => {
    if (reduced) return undefined;
    const id = setInterval(() => { if (!document.hidden) setTick((v) => v + 1); }, 2600);
    return () => clearInterval(id);
  }, [reduced]);

  const active = tick % RING_N;
  const cx = 210; const cy = 210; const R = 150;
  const nodes = Array.from({ length: RING_N }, (_, i) => {
    const a = (-90 + i * (360 / RING_N)) * (Math.PI / 180);
    return { i, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

  return (
    <div className="lp-visual" role="img" aria-label={t('lp.hero.visualLabel')}>
      <svg viewBox="0 0 420 420" className="lp-ring" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="lp-gold" cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset=".55" stopColor="#f2b632" />
            <stop offset="1" stopColor="#a9740b" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R} className="lp-ring-track" />
        <circle cx={cx} cy={cy} r={R + 34} className="lp-ring-halo" />
        {nodes.map((n) => {
          const state = n.i === active ? 'is-active' : n.i < active ? 'is-done' : '';
          return (
            <g key={n.i} className={`lp-node ${state}`}>
              <circle cx={n.x} cy={n.y} r="27" className="lp-node-bg" />
              <text x={n.x} y={n.y + 5} textAnchor="middle" className="lp-node-t">{n.i + 1}</text>
            </g>
          );
        })}
        <g className="lp-pot-orbit" style={{ transform: `rotate(${tick * (360 / RING_N)}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <circle cx={cx} cy={cy - (R + 34)} r="11" fill="url(#lp-gold)" className="lp-pot-dot" />
        </g>
      </svg>
      <div className="lp-ring-center">
        <span className="lp-ring-round">{t('lp.hero.round')} {active + 1}/{RING_N}</span>
        <strong>{fmt(RING_POT, lang)}</strong>
        <span className="lp-ring-cur">FCFA · {t('lp.hero.pot')}</span>
      </div>
      <div className="lp-ledger" aria-hidden="true">
        <span className="lp-ledger-ic"><Check size={16} /></span>
        <div>
          <b>{t('lp.hero.ledgerKind')}</b>
          <code>TXN-20261117-A7K2P9QX41</code>
          <small>{t('lp.hero.ledgerMeta')}</small>
        </div>
      </div>
      <span className="lp-example">{t('lp.hero.example')}</span>
    </div>
  );
}

// ------------------------------------------------------------
// 01 Hero
// ------------------------------------------------------------
function Hero() {
  const { t } = useTranslation();
  return (
    <section className="lp-hero" aria-labelledby="lp-h1">
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow"><span className="lp-dot" aria-hidden="true" />{t('lp.hero.eyebrow')}</p>
          <h1 id="lp-h1">
            {t('lp.hero.title')} <em>{t('lp.hero.highlight')}</em>
          </h1>
          <p className="lp-lead">{t('lp.hero.sub')}</p>
          <div className="lp-actions">
            <a className="lp-btn lp-btn-primary lp-btn-lg" href="#contact">
              {t('lp.hero.cta')} <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#fonctionnement">{t('lp.hero.ctaSecondary')}</a>
          </div>
          <p className="lp-note">{t('lp.hero.note')}</p>
        </div>
        <RotationVisual />
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 02 Problème
// ------------------------------------------------------------
function Problem() {
  const { t } = useTranslation();
  const icons = [ScrollText, EyeOff, UserX];
  return (
    <section className="lp-section" aria-labelledby="lp-problem">
      <div className="lp-wrap">
        <Reveal><SectionHead id="lp-problem" kicker={t('lp.problem.kicker')} title={t('lp.problem.title')} sub={t('lp.problem.sub')} /></Reveal>
        <div className="lp-grid lp-grid-3">
          {listOf(t, 'lp.problem.items').map((it, i) => {
            const Icon = icons[i] || ScrollText;
            return (
              <Reveal key={it.title} delay={i * 80}>
                <article className="lp-card lp-card-plain">
                  <span className="lp-card-num" aria-hidden="true">0{i + 1}</span>
                  <Icon size={24} strokeWidth={1.6} className="lp-ic" aria-hidden="true" />
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 03 Solution + simulateur
// ------------------------------------------------------------
function Simulator({ onUse }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'fr';
  const uid = useId();
  const [members, setMembers] = useState('8');
  const [amount, setAmount] = useState('10000');
  const [freq, setFreq] = useState('monthly');

  const m = Number(members); const a = Number(amount);
  const mOk = Number.isInteger(m) && m >= 2 && m <= 50;
  const aOk = Number.isInteger(a) && a >= 100 && a <= 100000000;
  const ok = mOk && aOk;
  const pot = ok ? m * a : 0;
  const total = ok ? m * a : 0;
  let duration = '';
  if (ok) {
    if (freq === 'monthly') duration = `${m} ${t('lp.sim.months')}`;
    else duration = `${freq === 'weekly' ? m : m * 2} ${t('lp.sim.weeks')}`;
  }

  return (
    <div className="lp-sim" role="group" aria-labelledby={`${uid}-t`}>
      <div className="lp-sim-form">
        <p className="lp-kicker">{t('lp.sim.kicker')}</p>
        <h3 id={`${uid}-t`}>{t('lp.sim.title')}</h3>
        <p className="lp-muted">{t('lp.sim.sub')}</p>

        <div className="lp-field">
          <label htmlFor={`${uid}-m`}>{t('lp.sim.members')}</label>
          <input id={`${uid}-m`} inputMode="numeric" value={members} aria-invalid={!mOk} aria-describedby={!mOk ? `${uid}-me` : undefined}
            onChange={(e) => setMembers(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          {!mOk && <small id={`${uid}-me`} className="lp-err" role="alert">{t('lp.sim.errMembers')}</small>}
        </div>
        <div className="lp-field">
          <label htmlFor={`${uid}-a`}>{t('lp.sim.amount')}</label>
          <input id={`${uid}-a`} inputMode="numeric" value={amount} aria-invalid={!aOk} aria-describedby={!aOk ? `${uid}-ae` : undefined}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))} />
          {!aOk && <small id={`${uid}-ae`} className="lp-err" role="alert">{t('lp.sim.errAmount')}</small>}
        </div>
        <div className="lp-field">
          <label htmlFor={`${uid}-f`}>{t('lp.sim.freq')}</label>
          <select id={`${uid}-f`} value={freq} onChange={(e) => setFreq(e.target.value)}>
            {['weekly', 'biweekly', 'monthly'].map((k) => <option key={k} value={k}>{t(`lp.sim.freqs.${k}`)}</option>)}
          </select>
        </div>
      </div>

      <div className="lp-sim-out" aria-live="polite">
        <div className="lp-sim-main">
          <span>{t('lp.sim.potLabel')}</span>
          <strong>{ok ? fmt(pot, lang) : '—'} <small>FCFA</small></strong>
        </div>
        <dl className="lp-sim-list">
          <div><dt>{t('lp.sim.roundsLabel')}</dt><dd>{ok ? m : '—'}</dd></div>
          <div><dt>{t('lp.sim.durationLabel')}</dt><dd>{ok ? duration : '—'}</dd></div>
          <div><dt>{t('lp.sim.eachLabel')}</dt><dd>{ok ? `${fmt(total, lang)} FCFA` : '—'}</dd></div>
        </dl>
        <p className="lp-sim-note">{t('lp.sim.note')}</p>
        <a className="lp-btn lp-btn-primary" href="#contact" onClick={() => onUse(ok ? String(m) : '')}>
          {t('lp.sim.cta')} <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

function Solution({ onUse }) {
  const { t } = useTranslation();
  const rows = listOf(t, 'lp.solution.cmpRows');
  return (
    <section className="lp-section lp-section-tint" aria-labelledby="lp-solution">
      <div className="lp-wrap">
        <Reveal><SectionHead id="lp-solution" kicker={t('lp.solution.kicker')} title={t('lp.solution.title')} sub={t('lp.solution.sub')} /></Reveal>

        <Reveal>
          <div className="lp-table-wrap" tabIndex={0} role="region" aria-label={t('lp.solution.cmpTitle')}>
            <table className="lp-cmp">
              <caption className="lp-sr">{t('lp.solution.cmpTitle')}</caption>
              <thead>
                <tr><th scope="col" /><th scope="col">{t('lp.solution.cmpPaper')}</th><th scope="col" className="is-app">{t('lp.solution.cmpApp')}</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.k}>
                    <th scope="row">{r.k}</th>
                    <td>{r.a}</td>
                    <td className="is-app"><Check size={16} aria-hidden="true" /> {r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={80}><Simulator onUse={onUse} /></Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 04 Bénéfices
// ------------------------------------------------------------
function Benefits() {
  const { t } = useTranslation();
  const icons = [Coins, Lock, Bell, Users, FileText, Smartphone];
  return (
    <section className="lp-section" id="avantages" aria-labelledby="lp-benefits">
      <div className="lp-wrap">
        <Reveal><SectionHead id="lp-benefits" kicker={t('lp.benefits.kicker')} title={t('lp.benefits.title')} /></Reveal>
        <div className="lp-grid lp-grid-3">
          {listOf(t, 'lp.benefits.items').map((it, i) => {
            const Icon = icons[i] || Coins;
            return (
              <Reveal key={it.title} delay={(i % 3) * 70}>
                <article className="lp-card">
                  <span className="lp-icbox"><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 05 Comment ça marche
// ------------------------------------------------------------
function How() {
  const { t } = useTranslation();
  return (
    <section className="lp-section lp-section-tint" id="fonctionnement" aria-labelledby="lp-how">
      <div className="lp-wrap">
        <Reveal><SectionHead id="lp-how" kicker={t('lp.how.kicker')} title={t('lp.how.title')} sub={t('lp.how.sub')} /></Reveal>
        <ol className="lp-steps">
          {listOf(t, 'lp.how.items').map((it, i) => (
            <Reveal key={it.title} delay={i * 100}>
              <li className="lp-step">
                <span className="lp-step-n" aria-hidden="true">{i + 1}</span>
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 06 Preuves de crédibilité
// ------------------------------------------------------------
function Trust() {
  const { t } = useTranslation();
  const icons = [KeyRound, Fingerprint, Database, ClipboardList, ShieldCheck, Lock];
  return (
    <section className="lp-section" id="garanties" aria-labelledby="lp-trust">
      <div className="lp-wrap">
        <Reveal><SectionHead id="lp-trust" kicker={t('lp.trust.kicker')} title={t('lp.trust.title')} sub={t('lp.trust.sub')} /></Reveal>
        <div className="lp-grid lp-grid-3">
          {listOf(t, 'lp.trust.items').map((it, i) => {
            const Icon = icons[i] || ShieldCheck;
            return (
              <Reveal key={it.title} delay={(i % 3) * 70}>
                <article className="lp-card lp-card-line">
                  <Icon size={22} strokeWidth={1.7} className="lp-ic" aria-hidden="true" />
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="lp-voices">
            <h3>{t('lp.trust.testimonialsTitle')}</h3>
            {TESTIMONIALS.length > 0 ? (
              <div className="lp-grid lp-grid-2">
                {TESTIMONIALS.map((q) => (
                  <figure key={q.author} className="lp-quote">
                    <blockquote>{q.quote}</blockquote>
                    <figcaption>{q.author}{q.role ? `, ${q.role}` : ''}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="lp-empty">
                <div>
                  <strong>{t('lp.trust.emptyTitle')}</strong>
                  <p>{t('lp.trust.emptyText')}</p>
                </div>
                <a className="lp-btn lp-btn-ghost" href="#contact">{t('lp.trust.emptyCta')} <ArrowUpRight size={16} aria-hidden="true" /></a>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 07 Offre
// ------------------------------------------------------------
function Offer() {
  const { t } = useTranslation();
  return (
    <section className="lp-section lp-section-tint" id="offre" aria-labelledby="lp-offer">
      <div className="lp-wrap">
        <Reveal><SectionHead id="lp-offer" kicker={t('lp.offer.kicker')} title={t('lp.offer.title')} sub={t('lp.offer.sub')} /></Reveal>
        <Reveal>
          <div className="lp-offer">
            <div className="lp-offer-list">
              <h3>{t('lp.offer.includedTitle')}</h3>
              <ul>
                {listOf(t, 'lp.offer.included').map((x) => (
                  <li key={x}><Check size={18} aria-hidden="true" /><span>{x}</span></li>
                ))}
              </ul>
              <div className="lp-soon">
                <b>{t('lp.offer.soonTitle')}</b>
                <p>{t('lp.offer.soon')}</p>
              </div>
            </div>
            <aside className="lp-offer-price">
              <span className="lp-kicker">{t('lp.offer.priceTitle')}</span>
              <strong>{t('lp.offer.price')}</strong>
              <p>{t('lp.offer.priceText')}</p>
              <a className="lp-btn lp-btn-primary lp-btn-lg" href="#contact">{t('lp.offer.cta')} <ArrowRight size={18} aria-hidden="true" /></a>
            </aside>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 08 FAQ
// ------------------------------------------------------------
function Faq() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(0);
  const uid = useId();
  return (
    <section className="lp-section" id="faq" aria-labelledby="lp-faq">
      <div className="lp-wrap lp-narrow">
        <Reveal><SectionHead id="lp-faq" kicker={t('lp.faq.kicker')} title={t('lp.faq.title')} /></Reveal>
        <Reveal>
          <div className="lp-faq">
            {listOf(t, 'lp.faq.items').map((it, i) => {
              const isOpen = open === i;
              return (
                <div key={it.q} className={`lp-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <h3>
                    <button type="button" id={`${uid}-b${i}`} aria-expanded={isOpen} aria-controls={`${uid}-p${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                      <span>{it.q}</span>
                      {isOpen ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                    </button>
                  </h3>
                  <div id={`${uid}-p${i}`} role="region" aria-labelledby={`${uid}-b${i}`} className="lp-faq-panel" hidden={!isOpen}>
                    <p>{it.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 09 CTA final + formulaire (pas de collecte serveur : ouvre WhatsApp)
// ------------------------------------------------------------
function FinalCta({ members: presetMembers }) {
  const { t } = useTranslation();
  const uid = useId();
  const [f, setF] = useState({ name: '', phone: '', members: '', message: '' });
  const [touched, setTouched] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => { if (presetMembers) setF((p) => ({ ...p, members: presetMembers })); }, [presetMembers]);

  const digits = f.phone.replace(/\D/g, '');
  const errors = {
    name: f.name.trim().length < 2 ? t('lp.cta.errName') : '',
    phone: digits.length < 8 || digits.length > 15 ? t('lp.cta.errPhone') : '',
    members: f.members !== '' && !(Number.isInteger(Number(f.members)) && Number(f.members) >= 2 && Number(f.members) <= 50) ? t('lp.cta.errMembers') : '',
  };
  const set = (k) => (e) => { setReady(false); setF({ ...f, [k]: e.target.value }); };
  const blur = (k) => () => setTouched((p) => ({ ...p, [k]: true }));

  const body = () => [
    t('lp.cta.waText'), '',
    `${t('lp.cta.waName')} : ${f.name.trim()}`,
    `${t('lp.cta.waPhone')} : ${f.phone.trim()}`,
    f.members ? `${t('lp.cta.waMembers')} : ${f.members}` : '',
    f.message.trim() ? `\n${f.message.trim()}` : '',
  ].filter((x, i) => x !== '' || i === 1).join('\n');

  const submit = (e) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, members: true });
    if (errors.name || errors.phone || errors.members) {
      const first = ['name', 'phone', 'members'].find((k) => errors[k]);
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(body())}`, '_blank', 'noopener,noreferrer');
    setReady(true);
  };

  const mailHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent(t('lp.cta.mailSubject'))}&body=${encodeURIComponent(body())}`;
  const err = (k) => touched[k] && errors[k];

  return (
    <section className="lp-cta" id="contact" aria-labelledby="lp-cta">
      <div className="lp-wrap lp-cta-grid">
        <Reveal>
          <div className="lp-cta-copy">
            <h2 id="lp-cta">{t('lp.cta.title')}</h2>
            <p>{t('lp.cta.sub')}</p>
            <p className="lp-cta-note"><Check size={16} aria-hidden="true" /> {t('lp.cta.note')}</p>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <form className="lp-form" onSubmit={submit} noValidate aria-label={t('lp.cta.formTitle')}>
            <div className="lp-field">
              <label htmlFor={`${uid}-name`}>{t('lp.cta.name')}</label>
              <input id={`${uid}-name`} autoComplete="name" value={f.name} onChange={set('name')} onBlur={blur('name')}
                aria-invalid={!!err('name')} aria-describedby={err('name') ? `${uid}-name-e` : undefined} required />
              {err('name') && <small id={`${uid}-name-e`} className="lp-err" role="alert">{errors.name}</small>}
            </div>
            <div className="lp-field">
              <label htmlFor={`${uid}-phone`}>{t('lp.cta.phone')}</label>
              <input id={`${uid}-phone`} type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set('phone')} onBlur={blur('phone')}
                aria-invalid={!!err('phone')} aria-describedby={`${uid}-phone-h${err('phone') ? ` ${uid}-phone-e` : ''}`} required />
              <small id={`${uid}-phone-h`} className="lp-hint">{t('lp.cta.phoneHint')}</small>
              {err('phone') && <small id={`${uid}-phone-e`} className="lp-err" role="alert">{errors.phone}</small>}
            </div>
            <div className="lp-field">
              <label htmlFor={`${uid}-members`}>{t('lp.cta.members')}</label>
              <input id={`${uid}-members`} inputMode="numeric" value={f.members}
                onChange={(e) => { setReady(false); setF({ ...f, members: e.target.value.replace(/\D/g, '').slice(0, 3) }); }} onBlur={blur('members')}
                aria-invalid={!!err('members')} aria-describedby={err('members') ? `${uid}-members-e` : undefined} />
              {err('members') && <small id={`${uid}-members-e`} className="lp-err" role="alert">{errors.members}</small>}
            </div>
            <div className="lp-field">
              <label htmlFor={`${uid}-msg`}>{t('lp.cta.message')}</label>
              <textarea id={`${uid}-msg`} rows={3} maxLength={500} value={f.message} onChange={set('message')} />
            </div>
            <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-block">
              {t('lp.cta.submit')} <ArrowRight size={18} aria-hidden="true" />
            </button>
            {ready && <p className="lp-ready" role="status">{t('lp.cta.ready')}</p>}
            <p className="lp-alt">
              <span>{t('lp.cta.or')}</span>
              <a href={mailHref}>{t('lp.cta.email')}</a>
              <a href={`tel:${CONTACT.phoneTel}`}><Phone size={14} aria-hidden="true" /> {t('lp.cta.call')}</a>
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// 10 Footer
// ------------------------------------------------------------
function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-footer-grid">
          <div>
            <Logo />
            <p className="lp-footer-tag">{t('lp.footer.tagline')}</p>
          </div>
          <nav aria-label={t('lp.footer.nav')}>
            <h4>{t('lp.footer.nav')}</h4>
            <ul>
              <li><a href="#fonctionnement">{t('lp.nav.how')}</a></li>
              <li><a href="#offre">{t('lp.nav.offer')}</a></li>
              <li><a href="#faq">{t('lp.nav.faq')}</a></li>
              <li><Link to="/connexion">{t('lp.footer.login')}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t('lp.footer.legal')}>
            <h4>{t('lp.footer.legal')}</h4>
            <ul>
              <li><Link to="/confidentialite">{t('lp.footer.privacy')}</Link></li>
              <li><Link to="/cgu">{t('lp.footer.terms')}</Link></li>
            </ul>
          </nav>
          <div>
            <h4>{t('lp.footer.contact')}</h4>
            <ul>
              <li><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
              <li><a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
              <li><a href={`tel:${CONTACT.phoneTel}`}>{CONTACT.phoneDisplay}</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} Tontine · {t('lp.footer.rights')}</span>
          <a href="#top">{t('lp.footer.top')}</a>
        </div>
      </div>
    </footer>
  );
}

// ------------------------------------------------------------
// CTA collant (mobile)
// ------------------------------------------------------------
function StickyCta() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [atContact, setAtContact] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const el = document.getElementById('contact');
    let io;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => setAtContact(e.isIntersecting), { threshold: 0.05 });
      io.observe(el);
    }
    return () => { window.removeEventListener('scroll', onScroll); io?.disconnect(); };
  }, []);

  return (
    <div className={`lp-sticky ${show && !atContact ? 'is-on' : ''}`} aria-hidden={!(show && !atContact)}>
      <a className="lp-btn lp-btn-primary lp-btn-block" href="#contact" tabIndex={show && !atContact ? 0 : -1}>
        {t('lp.sticky')} <ArrowRight size={18} aria-hidden="true" />
      </a>
    </div>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------
export default function Landing() {
  const { t, i18n } = useTranslation();
  const [members, setMembers] = useState('');

  useEffect(() => {
    document.body.classList.add('lp-on');
    return () => document.body.classList.remove('lp-on');
  }, []);

  useEffect(() => { document.documentElement.lang = i18n.language?.split('-')[0] || 'fr'; }, [i18n.language]);

  return (
    <div className="lp" id="top">
      <a className="lp-skip" href="#lp-main">{t('lp.skip')}</a>
      <LandingNav />
      <main id="lp-main">
        <Hero />
        <Problem />
        <Solution onUse={setMembers} />
        <Benefits />
        <How />
        <Trust />
        <Offer />
        <Faq />
        <FinalCta members={members} />
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
