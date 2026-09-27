import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, money, qs } from '../api.js';
import { Icons } from './Icons.jsx';

export function Search({ onClose }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ tontines: [], members: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (q.length < 2) {
      setResults({ tontines: [], members: [] });
      setOpen(false);
      return;
    }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const [tontines, members] = await Promise.all([
          api(`/tontines${qs({ q, limit: 5 })}`).then((r) => r.data).catch(() => []),
          api(`/members/search${qs({ q, limit: 5 })}`).then((r) => r.data).catch(() => []),
        ]);
        setResults({ tontines, members });
        setOpen(true);
      } catch { /* ignore */ }
      setLoading(false);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const goTo = (path) => {
    setOpen(false);
    setQ('');
    onClose?.();
    nav(path);
  };

  const isEmpty = results.tontines.length === 0 && results.members.length === 0;

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <div className="search-input-wrapper">
        <Icons.Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder={t('search.placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="search-input"
          onFocus={() => q.length >= 2 && setOpen(true)}
        />
        {q && (
          <button className="search-clear" onClick={() => { setQ(''); setOpen(false); }}>
            <Icons.Close size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="search-results">
          {loading ? (
            <div className="search-loading">
              <Icons.Loading size={16} className="spin" />
              <span>Recherche…</span>
            </div>
          ) : isEmpty ? (
            <div className="search-empty">{t('search.noResult')}</div>
          ) : (
            <>
              {results.tontines.length > 0 && (
                <div className="search-group">
                  <div className="search-group-title">{t('search.tontines')}</div>
                  {results.tontines.map((tontine) => (
                    <button key={tontine.id} className="search-item" onClick={() => goTo(`/app/tontines/${tontine.id}`)}>
                      <Icons.Tontines size={16} />
                      <span className="search-item-title">{tontine.name}</span>
                      <span className="search-item-meta">{money(tontine.contributionAmount, tontine.currency)}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.members.length > 0 && (
                <div className="search-group">
                  <div className="search-group-title">{t('search.members')}</div>
                  {results.members.map((member) => (
                    <button key={member.id} className="search-item" onClick={() => goTo(`/app/tontines/${member.tontineId}`)}>
                      <Icons.Users size={16} />
                      <span className="search-item-title">{member.displayName}</span>
                      <span className="search-item-meta">{member.tontineName}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}