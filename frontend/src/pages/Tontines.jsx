import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, money, fdate, qs } from '../api.js';
import { Tilt } from '../components/Fx.jsx';
import { Badge, Empty, Msg, Pager, useAction, SkeletonCard, ConfirmModal, toast } from '../components/ui.jsx';
import { Icons } from '../components/Icons.jsx';

export default function Tontines() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [res, setRes] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [f, setF] = useState({
    name: '',
    description: '',
    contributionAmount: 10000,
    frequency: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
  });
  const a = useAction();
  const del = useAction();

  useEffect(() => {
    setRes(null);
    api(`/tontines${qs({ page, limit: 12, status: status || undefined })}`)
      .then((r) => setRes(r))
      .catch(() => setRes({ data: [], meta: null }));
  }, [page, status]);

  const create = async (e) => {
    e.preventDefault();
    const r = await a.run(() => api('/tontines', {
      method: 'POST',
      body: { ...f, contributionAmount: Number(f.contributionAmount), description: f.description || null },
    }));
    if (r) nav(`/app/tontines/${r.data.id}`);
  };

  const remove = async (tontine) => {
    setConfirmDelete(null);
    const r = await del.run(() => api(`/tontines/${tontine.id}`, { method: 'DELETE' }));
    if (r) {
      toast(t('admin.userDeleted'), 'success');
      setRes(null);
      api(`/tontines${qs({ page, limit: 12, status: status || undefined })}`).then(setRes).catch(() => {});
    }
  };

  const loading = res === null;
  const data = res?.data || [];

  const chartData = data.slice(0, 6).map((tontine) => ({
    name: tontine.name.length > 12 ? tontine.name.slice(0, 12) + '…' : tontine.name,
    [t('dashboard.chart.collected')]: Number(tontine.collected || 0),
    [t('dashboard.chart.paid')]: Number(tontine.paidOut || 0),
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '.3rem' }}>{t('tontines.title')}</h1>
          <p className="mut" style={{ margin: 0 }}>
            {loading ? t('common.loading')
              : data.length === 0 ? t('tontines.none')
              : t('tontines.count', { count: data.length })}
          </p>
        </div>
        <button className="btn" onClick={() => setOpen(!open)}>
          {open ? t('tontines.close') : t('tontines.new')}
        </button>
      </div>

      {open && (
        <form className="card mt" onSubmit={create}>
          <h3>{t('tontines.createTitle')}</h3>
          <div className="grid g2">
            <div>
              <label>{t('tontines.name')} *</label>
              <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t('tontines.namePlaceholder')} />
            </div>
            <div>
              <label>{t('tontines.contributionAmount')} *</label>
              <input required type="number" min="100" step="100" value={f.contributionAmount}
                onChange={(e) => setF({ ...f, contributionAmount: e.target.value })} />
            </div>
            <div>
              <label>{t('tontines.frequency')} *</label>
              <select value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
                {['weekly', 'biweekly', 'monthly'].map((x) => (
                  <option key={x} value={x}>{t(`freq.${x}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label>{t('tontines.startDate')} *</label>
              <input required type="date" value={f.startDate}
                onChange={(e) => setF({ ...f, startDate: e.target.value })} />
            </div>
          </div>
          <label>{t('tontines.description')} ({t('common.optional')})</label>
          <textarea
            maxLength={500}
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder={t('tontines.descriptionPlaceholder')}
            rows={3}
          />
          <Msg>{a.error}</Msg>
          <div className="row between mt" style={{ gap: '.6rem' }}>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn" disabled={a.busy}>{a.busy ? '…' : t('tontines.createBtn')}</button>
          </div>
        </form>
      )}

      <div className="row mt" style={{ gap: '.5rem' }}>
        <span className="mut sm">{t('tontines.filter')} :</span>
        {[
          ['', t('tontines.all')],
          ['active', t('tontines.active')],
          ['draft', t('tontines.draft')],
          ['completed', t('tontines.completed')],
          ['archived', t('tontines.archived')],
        ].map(([v, l]) => (
          <button key={v} className={`btn sm ${status === v ? '' : 'ghost'}`} onClick={() => { setStatus(v); setPage(1); }}>
            {l}
          </button>
        ))}
      </div>

      {/* Graphique */}
      {!loading && chartData.length > 0 && (
        <div className="card mt">
          <h3>{t('dashboard.financialOverview')}</h3>
          <p className="mut sm">{t('dashboard.financialOverviewDesc')}</p>
          <div style={{ width: '100%', height: 240, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--mut)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--mut)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    color: 'var(--txt)',
                  }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR') + ' FCFA'}
                />
                <Bar dataKey={t('dashboard.chart.collected')} fill="#2ecc8f" radius={[6, 6, 0, 0]} />
                <Bar dataKey={t('dashboard.chart.paid')} fill="#f2b632" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid g2 mt">
        {loading ? (
          <>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </>
        ) : data.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <Empty>
              {status
                ? <>{t('tontines.emptyFilter')}</>
                : <>{t('tontines.empty')}<br />
                  <button className="btn mt" onClick={() => setOpen(true)}>{t('tontines.createFirst')}</button></>}
            </Empty>
          </div>
        ) : (
          data.map((tontine) => {
            const pct = tontine.roundsTotal ? (tontine.roundsDone / tontine.roundsTotal) * 100 : 0;
            const canDelete = ['draft', 'archived'].includes(tontine.status) && (tontine.myRole === 'manager' || tontine.myRole === 'admin');
            return (
              <Tilt key={tontine.id}>
                <div className="row between" style={{ alignItems: 'flex-start', gap: '.5rem' }}>
                  <Link to={`/app/tontines/${tontine.id}`} style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ marginBottom: '.3rem' }}>{tontine.name}</h3>
                  </Link>
                  {canDelete && (
                    <button
                      className="btn ghost sm"
                      onClick={() => setConfirmDelete(tontine)}
                      title={t('common.delete')}
                      style={{ color: 'var(--red)' }}
                    >
                      <Icons.Delete size={14} />
                    </button>
                  )}
                </div>
                <div className="row" style={{ gap: '.4rem' }}>
                  <Badge v={tontine.status} />
                  {tontine.myRole && <Badge v={tontine.myRole} />}
                </div>
                <p className="mut sm" style={{ margin: '.5rem 0 .3rem' }}>
                  {money(tontine.contributionAmount, tontine.currency)} · {t(`freq.${tontine.frequency}`)}
                </p>
                <p className="mut sm" style={{ margin: 0 }}>
                  {tontine.memberCount} {tontine.memberCount > 1 ? t('tontines.members_plural') : t('tontines.members')} · {t('tontines.start')} {fdate(tontine.startDate)}
                </p>
                {tontine.roundsTotal > 0 && (
                  <>
                    <div className="progress mt"><i style={{ width: `${pct}%` }} /></div>
                    <small className="mut">
                      {t('tontines.roundsDone', { done: tontine.roundsDone, total: tontine.roundsTotal })}
                    </small>
                  </>
                )}
              </Tilt>
            );
          })
        )}
      </div>

      {!loading && <Pager meta={res?.meta} onPage={setPage} />}

      <ConfirmModal
        open={!!confirmDelete}
        title={t('tontines.deleteConfirmTitle')}
        message={confirmDelete ? t('tontines.deleteConfirmDesc', { name: confirmDelete.name }) : ''}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger
        onConfirm={() => remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}