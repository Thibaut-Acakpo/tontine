import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function LegalShell({ title, children }) {
  const { t } = useTranslation();
  return (
    <div className="pub">
      <nav className="pubnav">
        <Link to="/" className="brand"><i>₣</i> Tontine</Link>
        <div className="row">
          <Link className="btn ghost" to="/">← {t('common.back')}</Link>
        </div>
      </nav>
      <div className="legal-page">
        <h1>{title}</h1>
        <p className="mut sm" style={{ marginBottom: '2rem' }}>
          {t('legal.lastUpdate')} : {new Date().toLocaleDateString(t('common.lang') === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div className="legal-content">{children}</div>
      </div>
      <footer className="landing-footer" style={{ marginTop: '4rem' }}>
        <div className="footer-bottom">
          <span className="mut sm">© {new Date().getFullYear()} Tontine · {t('home.footerRights')}</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// POLITIQUE DE CONFIDENTIALITÉ
// ============================================================
export function Privacy() {
  const { t } = useTranslation();
  return (
    <LegalShell title={t('legal.privacyTitle')}>
      <section>
        <h2>{t('legal.privacy.s1.title')}</h2>
        <p>{t('legal.privacy.s1.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s2.title')}</h2>
        <p>{t('legal.privacy.s2.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s3.title')}</h2>
        <p>{t('legal.privacy.s3.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s4.title')}</h2>
        <p>{t('legal.privacy.s4.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s5.title')}</h2>
        <p>{t('legal.privacy.s5.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s6.title')}</h2>
        <p>{t('legal.privacy.s6.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s7.title')}</h2>
        <p>{t('legal.privacy.s7.text')} <span className="legal-placeholder">[À COMPLÉTER]</span></p>
      </section>
      <section>
        <h2>{t('legal.privacy.s8.title')}</h2>
        <p>{t('legal.privacy.s8.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s9.title')}</h2>
        <p>{t('legal.privacy.s9.text')}</p>
      </section>
      <section>
        <h2>{t('legal.privacy.s10.title')}</h2>
        <p>{t('legal.privacy.s10.text')}</p>
      </section>
    </LegalShell>
  );
}

// ============================================================
// CGU
// ============================================================
export function Terms() {
  const { t } = useTranslation();
  return (
    <LegalShell title={t('legal.termsTitle')}>
      <section>
        <h2>{t('legal.terms.s1.title')}</h2>
        <p>{t('legal.terms.s1.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s2.title')}</h2>
        <p>{t('legal.terms.s2.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s3.title')}</h2>
        <p>{t('legal.terms.s3.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s4.title')}</h2>
        <p>{t('legal.terms.s4.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s5.title')}</h2>
        <p>{t('legal.terms.s5.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s6.title')}</h2>
        <p>{t('legal.terms.s6.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s7.title')}</h2>
        <p>{t('legal.terms.s7.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s8.title')}</h2>
        <p>{t('legal.terms.s8.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s9.title')}</h2>
        <p>{t('legal.terms.s9.text')}</p>
      </section>
      <section>
        <h2>{t('legal.terms.s10.title')}</h2>
        <p>{t('legal.terms.s10.text')}</p>
      </section>
    </LegalShell>
  );
}