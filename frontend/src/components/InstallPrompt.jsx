import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from './Icons.jsx';

export function InstallPrompt() {
  const { t } = useTranslation();
  const [promptEvent, setPromptEvent] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Détection de la plateforme et du mode standalone
  useEffect(() => {
    // ✅ Détecter si l'app est déjà installée (standalone)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // ✅ Détecter la plateforme
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');
    else setPlatform('other');

    // ✅ Ne pas afficher si déjà installée
    if (standalone) return;

    // ✅ Écouter le prompt Android
    const handler = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ✅ Afficher la bannière si :
  //   - Pas en mode standalone (pas installée)
  //   - Pas dismissée dans cette session
  //   - OU si Android avec prompt natif dispo
  //   - OU si iOS (instructions manuelles)
  if (isStandalone || dismissed) return null;

  // Android : afficher si promptEvent reçu
  if (platform === 'android' && !promptEvent) return null;

  // Autres navigateurs (Firefox, etc.) : ne pas afficher
  if (platform === 'other' && !promptEvent) return null;

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setPromptEvent(null);
  };

  // ✅ "Plus tard" : ne bloque que pour cette session
  // (la bannière réapparaîtra à la prochaine visite)
  const dismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <Icons.Phone size={28} />
        </div>
        <div className="install-prompt-text">
          <div className="install-prompt-title">Installer Tontine</div>
          {platform === 'ios' ? (
            <div className="install-prompt-desc">
              Appuyez sur <b>Partager</b> puis <b>« Sur l'écran d'accueil »</b>
            </div>
          ) : (
            <div className="install-prompt-desc">
              Accès rapide depuis votre écran d'accueil
            </div>
          )}
        </div>
        <div className="install-prompt-actions">
          <button className="btn ghost sm" onClick={dismiss}>Plus tard</button>
          {platform !== 'ios' && (
            <button className="btn sm" onClick={install}>Installer</button>
          )}
        </div>
      </div>
    </div>
  );
}