import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { ConfirmModal } from './ui.jsx';
import { Icons } from './Icons.jsx';
import { Search } from './Search.jsx';
import { useTheme } from './ThemeProvider.jsx';

// Avatar avec initiales colorées
function Avatar({ name, size = 36 }) {
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
      flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useTranslation();
  const { theme, toggle: toggleTheme } = useTheme();
  const [unread, setUnread] = useState(0);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    api('/notifications?limit=1')
      .then((r) => setUnread(r.meta.unread))
      .catch(() => {});
  }, [loc.pathname]);

  useEffect(() => { setDrawerOpen(false); }, [loc.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const link = (to, txt, IconComp, extra, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `nav ${isActive ? 'active' : ''}`}
      onClick={() => setDrawerOpen(false)}
    >
      <span className="nav-icon"><IconComp size={18} /></span>
      <span className="nav-label">{txt}</span>
      {extra}
    </NavLink>
  );

  const handleLogout = async () => {
    setConfirmLogout(false);
    await logout();
    nav('/');
  };

  return (
    <div className="shell">
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
      )}

      {/* Barre supérieure mobile */}
      <header className="topbar">
        <div className="topbar-brand">
          <i>₣</i>
          <span>Tontine</span>
        </div>
        <div className="topbar-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            aria-label="Changer de thème"
          >
            {theme === 'dark' ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
          </button>
          <button
            className="topbar-toggle"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label={drawerOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? <Icons.Close size={22} /> : <Icons.Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Menu latéral */}
      <aside className={`side ${drawerOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <div className="brand">
            <i>₣</i>
            <span>Tontine</span>
          </div>
          <p className="brand-tagline">Gestion de tontines</p>
        </div>

        {/* Recherche (desktop) */}
        <div className="side-search">
          <Search />
        </div>

        <nav className="side-nav">
          {link('/app', t('menu.dashboard'), Icons.Dashboard, null, true)}
          {link('/app/tontines', t('menu.tontines'), Icons.Tontines)}
          {link('/app/paiements', t('menu.payments'), Icons.Payments)}
          {link('/app/notifications', t('menu.notifications'), Icons.Notifications, unread > 0 && <span className="dot">{unread}</span>)}
          {link('/app/profil', t('menu.profile'), Icons.Profile)}
          {link('/app/parametres', t('menu.settings'), Icons.Settings)}
          {user.role === 'admin' && link('/app/admin', t('menu.admin'), Icons.Admin)}
        </nav>

        <div className="side-bottom">
          <button className="side-theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
            <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
          <Link to="/" className="nav nav-external" target="_blank" rel="noopener noreferrer">
            <span className="nav-icon"><Icons.External size={16} /></span>
            <span className="nav-label">{t('menu.seeSite')}</span>
          </Link>
        </div>

        <div className="user-block">
          <Avatar name={user.fullName} size={36} />
          <div className="user-info">
            <div className="user-name">{user.fullName}</div>
            <div className="user-role">{t(`role.${user.role}`)}</div>
          </div>
          <button
            className="user-logout"
            onClick={() => setConfirmLogout(true)}
            title={t('menu.logout')}
            aria-label={t('menu.logout')}
          >
            <Icons.Logout size={18} />
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="page" key={loc.pathname}><Outlet /></div>
      </main>

      <ConfirmModal
        open={confirmLogout}
        title="Se déconnecter ?"
        message="Vous devrez vous reconnecter pour accéder à votre espace."
        confirmText={t('menu.logout')}
        cancelText={t('common.cancel')}
        danger
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}