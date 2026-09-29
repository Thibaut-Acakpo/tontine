import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { setCsrf } from './api.js';
import Layout from './components/Layout.jsx';
import { Home, Login, Register, Forgot, Reset, VerifyEmail, VerifyPin, Verify2FA } from './pages/Public.jsx';
import { Privacy, Terms } from './pages/Legal.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tontines from './pages/Tontines.jsx';
import TontineDetail from './pages/TontineDetail.jsx';
import { Payments, Notifications, Profile, Settings, Admin } from './pages/Account.jsx';

function Private({ children, admin }) {
  const { user, loading } = useAuth(); const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/connexion" state={{ from: loc }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  // ✅ NOUVEAU : recharge le CSRF token au démarrage de l'app
  useEffect(() => {
  fetch('/api/auth/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data?.csrfToken) setCsrf(data.csrfToken);
    })
    .catch(() => {});
}, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/inscription" element={<Register />} />
      <Route path="/connexion" element={<Login />} />
      <Route path="/mot-de-passe-oublie" element={<Forgot />} />
      <Route path="/reinitialiser-mot-de-passe" element={<Reset />} />
      <Route path="/verifier-email" element={<VerifyEmail />} />

      <Route path="/confidentialite" element={<Privacy />} />
      <Route path="/cgu" element={<Terms />} />

      <Route path="/2fa" element={<Verify2FA />} />
      <Route path="/pin" element={<Private><VerifyPin /></Private>} />

      <Route path="/app" element={<Private><Layout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="tontines" element={<Tontines />} />
        <Route path="tontines/:id" element={<TontineDetail />} />
        <Route path="paiements" element={<Payments />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profil" element={<Profile />} />
        <Route path="parametres" element={<Settings />} />
        <Route path="admin" element={<Private admin><Admin /></Private>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}