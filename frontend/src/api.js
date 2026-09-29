// Client API : cookies de session HttpOnly (jamais lisibles par JS) + jeton CSRF gardé en mémoire uniquement.
// Aucune clé secrète dans le frontend.

// ✅ URL de l'API : en dev utilise le proxy Vite (vide), en prod utilise la variable d'environnement Vercel
const API_URL = import.meta.env.VITE_API_URL || '';

let csrfToken = null;
export const setCsrf = (t) => { csrfToken = t; };

export async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const opts = { method, credentials: 'include', headers: { ...headers } };
  if (method !== 'GET') opts.headers['X-CSRF-Token'] = csrfToken || '';
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try {
    // ✅ Utilise API_URL (vide en local → proxy Vite, rempli en prod → Render)
    res = await fetch(`${API_URL}/api${path}`, opts);
  } catch {
    throw new Error('Serveur injoignable');
  }
  if (raw) return res;
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const err = new Error(json?.error?.message || 'Une erreur est survenue');
    err.status = res.status; err.code = json?.error?.code; err.details = json?.error?.details;
    throw err;
  }
  return json;
}

export const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const money = (n, cur = 'XOF') => `${Number(n || 0).toLocaleString('fr-FR')} ${cur === 'XOF' ? 'FCFA' : cur}`;
export const fdate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fdatetime = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
