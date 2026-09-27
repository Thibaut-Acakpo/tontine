import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from './Icons.jsx';

export function InstallPrompt() {
  const { t } = useTranslation();
  const [promptEvent, setPromptEvent] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed') === '1') {
      setDismissed(true);
    }
    const handler = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setPromptEvent(null);
  };

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1');
    setDismissed(true);
  };

  if (!promptEvent || dismissed) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <Icons.Phone size={28} />
        </div>
        <div className="install-prompt-text">
          <div className="install-prompt-title">Installer Tontine</div>
          <div className="install-prompt-desc">Accès rapide depuis votre écran d'accueil</div>
        </div>
        <div className="install-prompt-actions">
          <button className="btn ghost sm" onClick={dismiss}>Plus tard</button>
          <button className="btn sm" onClick={install}>Installer</button>
        </div>
      </div>
    </div>
  );
}