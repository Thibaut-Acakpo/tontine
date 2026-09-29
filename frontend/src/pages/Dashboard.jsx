import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, money, fdate, fdatetime } from '../api.js';
import { useAuth } from '../auth.jsx';
import { CountUp, Tilt, Reveal } from '../components/Fx.jsx';
import { Badge, Empty, SkeletonStat, SkeletonList, SkeletonCard } from '../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tontines, setTontines] = useState(null);
  const [due, setDue] = useState(null);
  const [notifs, setNotifs] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    api('/tontines?limit=50').then((r) => {
      setTontines(r.data);
      const active = r.data.filter((x) => x.status === 'active').slice(0, 6);
      setChartData(active.map((x) => ({
        name: x.name.length > 8 ? x.name.slice(0, 8) + '…' : x.name,
        collecté: Number(x.collected || 0),
        versé: Number(x.paidOut || 0),
      })));
    }).catch(() => setTontines([]));

    api('/contributions/mine').then((r) => setDue(r.data)).catch(() => setDue([]));
    api('/notifications?limit=4').then((r) => setNotifs(r.data)).catch(() => setNotifs([]));
  }, []);

  const active = (tontines || []).filter((x) => x.status === 'active');
  const owed = (due || []).reduce((s, c) => s + Number(c.amountDue || 0), 0);
  const loading = tontines === null;

  return (
    <>
      <div className="dash-hero">
        <div>
          <h1 style={{ marginBottom: '.3rem' }}>
            {t('dashboard.hello', { name: user.fullName.split(' ')[0] })}
          </h1>
          <p className="mut" style={{ margin: 0 }}>
            {loading ? t('dashboard.loading')
              : active.length === 0 ? t('dashboard.noActive')
              : due?.length === 0 ? t('dashboard.allUpToDate')
              : t('dashboard.pendingCount', { count: due?.length ?? 0 })}
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid g4 mt">
        {loading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          [
            [t('dashboard.activeTontines'), active.length],
            [t('dashboard.contributionsDue'), due?.length ?? 0],
            [t('dashboard.amountOwed'), owed],
            [t('dashboard.myTontines'), (tontines || []).length],
          ].map(([l, v], i) => (
            <Reveal key={l} delay={i * 80}>
              <Tilt className="stat">
                <b><CountUp value={v} /></b>
                <span>{l}</span>
              </Tilt>
            </Reveal>
          ))
        )}
      </div>

      {/* Graphique financier */}
      {!loading && chartData.length > 0 && (
        <div className="card mt">
          <h3>{t('dashboard.financialOverview')}</h3>
          <p className="mut sm">{t('dashboard.financialOverviewDesc')}</p>
          <div style={{ width: '100%', height: 260, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCollecte" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2ecc8f" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#2ecc8f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVerse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f2b632" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f2b632" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area type="monotone" dataKey="collecté" stroke="#2ecc8f" fill="url(#colorCollecte)" strokeWidth={2} />
                <Area type="monotone" dataKey="versé" stroke="#f2b632" fill="url(#colorVerse)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* À payer + Notifications */}
      <div className="grid g2 mt">
        <Tilt>
          <div className="row between">
            <h3 style={{ marginBottom: 0 }}>{t('dashboard.toPay')}</h3>
            <Link to="/app/paiements" className="sm">{t('dashboard.seeAll')}</Link>
          </div>
          {due === null ? (
            <div className="mt"><SkeletonList rows={3} /></div>
          ) : due.length === 0 ? (
            <Empty>{t('dashboard.noPending')}</Empty>
          ) : (
            <div className="dash-list">
              {due.slice(0, 5).map((c) => (
                <Link key={c.id} to={`/app/tontines/${c.tontineId}`} className="dash-item">
                  <div className="dash-item-main">
                    <div className="dash-item-title">
                      {c.tontineName} · {t('dashboard.tour', { number: c.roundNumber })}
                    </div>
                    <div className="dash-item-sub">
                      {t('dashboard.dueDate', { date: fdate(c.dueDate) })}
                    </div>
                  </div>
                  <b className="dash-item-amount">{money(c.amountDue, c.currency)}</b>
                </Link>
              ))}
              {due.length > 5 && (
                <Link to="/app/paiements" className="sm mut" style={{ display: 'block', textAlign: 'center', padding: '.5rem' }}>
                  {t('dashboard.others', { count: due.length - 5 })}
                </Link>
              )}
            </div>
          )}
        </Tilt>

        <Tilt>
          <div className="row between">
            <h3 style={{ marginBottom: 0 }}>{t('dashboard.notifications')}</h3>
            <Link to="/app/notifications" className="sm">{t('dashboard.seeAll')}</Link>
          </div>
          {notifs === null ? (
            <div className="mt"><SkeletonList rows={3} /></div>
          ) : notifs.length === 0 ? (
            <Empty>{t('dashboard.noNotifications')}</Empty>
          ) : (
            <div className="dash-list">
              {notifs.map((n) => (
                <div key={n.id} className="dash-item">
                  <div className="dash-item-main">
                    <div className="dash-item-title">{n.title}</div>
                    <div className="dash-item-sub">{n.body}</div>
                    <div className="dash-item-time">{fdatetime(n.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tilt>
      </div>

      {/* Tontines actives */}
      <div className="row between mt" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: 0 }}>{t('dashboard.myActiveTontines')}</h2>
        <Link to="/app/tontines" className="sm">{t('dashboard.seeAll')}</Link>
      </div>
      <div className="grid g2">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : active.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem 1rem' }}>
            <p className="mut" style={{ marginBottom: '1rem' }}>{t('dashboard.noActiveTontines')}</p>
            <Link to="/app/tontines" className="btn">{t('dashboard.createFirst')}</Link>
          </div>
        ) : (
          active.map((x) => {
            const pct = x.roundsTotal ? (x.roundsDone / x.roundsTotal) * 100 : 0;
            return (
              <Tilt key={x.id}>
                <Link to={`/app/tontines/${x.id}`}><h3>{x.name}</h3></Link>
                <div className="row">
                  <Badge v={x.status} />
                  <span className="mut sm">
                    {money(x.contributionAmount, x.currency)} · {x.memberCount} {t('tontines.members')}
                  </span>
                </div>
                <div className="progress mt"><i style={{ width: `${pct}%` }} /></div>
                <small className="mut">
                  {t('tontines.roundsDone', { done: x.roundsDone, total: x.roundsTotal })}
                </small>
              </Tilt>
            );
          })
        )}
      </div>
    </>
  );
}