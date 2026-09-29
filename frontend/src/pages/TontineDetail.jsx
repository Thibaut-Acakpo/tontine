import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, money, fdate, fdatetime, qs } from '../api.js';
import { Tilt } from '../components/Fx.jsx';
import { Badge, Empty, Msg, Pager, useAction, ConfirmModal, toast } from '../components/ui.jsx';
import { Icons } from '../components/Icons.jsx';
import { exportTontinePDF } from '../utils/pdf.js';

export default function TontineDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const [tontine, setT] = useState(null);
  const [tab, setTab] = useState('tours');
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const reload = useCallback(() => setTick((x) => x + 1), []);

  useEffect(() => {
    api(`/tontines/${id}`).then((r) => setT(r.data)).catch((e) => setErr(e.message));
  }, [id, tick]);

  if (err) return <Msg>{err}</Msg>;

  if (!tontine) {
    return (
      <>
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '40%', height: '1.5rem', borderRadius: 8 }} />
          </div>
        </div>
        <div className="grid g4 mt">
          <div className="skeleton" style={{ height: 80, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: 18 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: 18 }} />
        </div>
      </>
    );
  }

  const manage = ['manager', 'treasurer', 'admin'].includes(tontine.myRole);
  const tabs = [
    ['tours', t('detail.tours')],
    ['membres', t('detail.members')],
    ['cotisations', t('detail.contributions')],
    ['historique', t('detail.history')],
  ];

  const archive = async () => {
    setConfirmArchive(false);
    try {
      await api(`/tontines/${id}/archive`, { method: 'POST', body: {} });
      toast(t('common.success'), 'success');
      nav('/app/tontines');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <div className="breadcrumb">
        <Link to="/app/tontines">{t('menu.tontines')}</Link>
        <span> › </span>
        <span>{tontine.name}</span>
      </div>

      <div className="page-header">
        <div style={{ minWidth: 0 }}>
          <h1 style={{ marginBottom: '.3rem', wordBreak: 'break-word' }}>{tontine.name}</h1>
          <div className="row" style={{ gap: '.4rem', marginBottom: '.4rem' }}>
            <Badge v={tontine.status} />
            <Badge v={tontine.myRole} />
          </div>
          <p className="mut sm" style={{ margin: 0 }}>
            {money(tontine.contributionAmount, tontine.currency)} · {t(`freq.${tontine.frequency}`)} · {t('tontines.start')} {fdate(tontine.startDate)}
          </p>
          {tontine.description && <p className="mut sm" style={{ marginTop: '.5rem' }}>{tontine.description}</p>}
        </div>
        <div className="row" style={{ gap: '.5rem' }}>
          <button className="btn ghost" onClick={() => exportTontinePDF(tontine, tontine.id)} title={t('detail.pdf')}>
            <Icons.Download size={16} /> {t('detail.pdf')}
          </button>
          {(tontine.myRole === 'manager' || tontine.myRole === 'admin') && ['completed', 'draft'].includes(tontine.status) && (
            <button className="btn ghost" onClick={() => setConfirmArchive(true)}>
              {t('detail.archive')}
            </button>
          )}
        </div>
      </div>

      <div className="grid g4 mt">
        {[
          [t('detail.membersCount'), tontine.memberCount],
          [t('detail.roundsDone'), `${tontine.roundsDone}/${tontine.roundsTotal}`],
          [t('detail.totalCollected'), money(tontine.collected, tontine.currency)],
          [t('detail.totalPaid'), money(tontine.paidOut, tontine.currency)],
        ].map(([l, v]) => (
          <Tilt key={l} className="stat"><b>{v}</b><span>{l}</span></Tilt>
        ))}
      </div>

      <div className="tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'tours' && <Rounds t={tontine} manage={manage} tick={tick} reload={reload} />}
      {tab === 'membres' && <Members t={tontine} reload={reload} />}
      {tab === 'cotisations' && <Contributions t={tontine} manage={manage} tick={tick} reload={reload} />}
      {tab === 'historique' && <History t={tontine} manage={manage} tick={tick} reload={reload} />}

      <ConfirmModal
        open={confirmArchive}
        title={t('detail.archiveConfirm')}
        message={t('common.confirm')}
        confirmText={t('detail.archive')}
        cancelText={t('common.cancel')}
        danger
        onConfirm={archive}
        onCancel={() => setConfirmArchive(false)}
      />
    </>
  );
}

function Rounds({ t: tontine, manage, tick, reload }) {
  const { t } = useTranslation();
  const [rounds, setR] = useState([]);
  const [confirmPay, setConfirmPay] = useState(null);
  const a = useAction();
  useEffect(() => { api(`/tontines/${tontine.id}/rounds`).then((r) => setR(r.data)).catch(() => {}); }, [tontine.id, tick]);

  const payout = async (round) => {
    setConfirmPay(null);
    if (await a.run(() => api('/payments/payout', { method: 'POST', body: { tontineId: tontine.id, roundId: round.id } }))) {
      toast(t('common.success'), 'success');
      reload();
    }
  };

  if (tontine.status === 'draft') return <Empty>{t('detail.draftRounds')}</Empty>;

  return (
    <>
      <div className="card scroll">
        <Msg>{a.error}</Msg>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t('detail.beneficiary')}</th>
              <th>{t('detail.dueDate')}</th>
              <th>{t('detail.contributionsCol')}</th>
              <th>{t('detail.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.id}>
                <td>#{r.roundNumber} {r.isCurrent && <Badge v="open" />}</td>
                <td>{r.beneficiaryName}</td>
                <td>{fdate(r.dueDate)}</td>
                <td style={{ minWidth: 140 }}>
                  <div className="progress"><i style={{ width: `${(r.contributionsPaid / r.contributionsTotal) * 100}%` }} /></div>
                  <small className="mut">{r.contributionsPaid}/{r.contributionsTotal} · {money(r.collected, tontine.currency)}</small>
                </td>
                <td><Badge v={r.status} /></td>
                <td>
                  {manage && r.isCurrent && r.contributionsPaid === r.contributionsTotal && (
                    <button className="btn sm" disabled={a.busy} onClick={() => setConfirmPay(r)}>
                      {t('detail.payout')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!confirmPay}
        title={t('detail.payout')}
        message={confirmPay ? t('detail.payoutConfirm', { amount: money(confirmPay.collected, tontine.currency), name: confirmPay.beneficiaryName }) : ''}
        confirmText={t('detail.payout')}
        cancelText={t('common.cancel')}
        onConfirm={() => payout(confirmPay)}
        onCancel={() => setConfirmPay(null)}
      />
    </>
  );
}

function Members({ t: tontine, reload }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ email: '', displayName: '' });
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const a = useAction();
  const del = useAction();
  const canEdit = ['manager', 'admin'].includes(tontine.myRole);
  const draft = tontine.status === 'draft';

  const load = useCallback(() => api(`/members${qs({ tontineId: tontine.id })}`).then((r) => setRows(r.data)).catch(() => {}), [tontine.id]);
  useEffect(() => { load(); }, [load]);

  const move = async (i, d) => {
    const ids = rows.map((r) => r.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    if (await a.run(() => api(`/members/order/${tontine.id}`, { method: 'PUT', body: { memberIds: ids } }))) load();
  };

  const removeMember = async (member) => {
    setConfirmDel(null);
    const r = await del.run(() => api(`/members/${member.id}`, { method: 'DELETE' }));
    if (r) {
      toast(t('detail.memberRemoved'), 'success');
      load();
      reload?.();
    }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const r = await a.run(() => api('/members', {
      method: 'POST',
      body: { tontineId: tontine.id, ...f },
    }));
    if (r) {
      toast(t('detail.memberAdded'), 'success');
      setF({ email: '', displayName: '' });
      load();
    }
  };

  const start = async () => {
    setConfirmStart(false);
    if (await a.run(() => api(`/tontines/${tontine.id}/start`, { method: 'POST', body: {} }))) {
      toast(t('common.success'), 'success');
      reload?.();
    }
  };

  return (
    <>
      <div className="card scroll">
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
        <table>
          <thead>
            <tr><th>{t('detail.order')}</th><th>{t('detail.name')}</th><th>{t('detail.email')}</th><th>{t('detail.role')}</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={m.id}>
                <td>
                  {m.position}
                  {canEdit && draft && (
                    <>
                      <button className="btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)}><Icons.Up size={12} /></button>
                      <button className="btn ghost sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><Icons.DownArrow size={12} /></button>
                    </>
                  )}
                </td>
                <td>{m.displayName} {!m.linked && <small className="mut">{t('detail.invited')}</small>}</td>
                <td className="mut">{m.email || '—'}</td>
                <td>
                  {canEdit && tontine.status !== 'archived' ? (
                    <select value={m.tontineRole} onChange={async (e) => {
                      if (await a.run(() => api(`/members/${m.id}`, { method: 'PATCH', body: { tontineRole: e.target.value } }))) { load(); reload?.(); }
                    }}>
                      {['member', 'treasurer', 'manager'].map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                    </select>
                  ) : <Badge v={m.tontineRole} />}
                </td>
                <td>
                  {canEdit && draft && m.tontineRole !== 'manager' && (
                    <button className="btn ghost sm" onClick={() => setConfirmDel(m)} style={{ color: 'var(--red)' }} title={t('detail.remove')}>
                      <Icons.Delete size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && draft && (
        <>
          <form className="card mt" onSubmit={submitAdd}>
            <h3>{t('detail.addMember')}</h3>
            <div className="grid g2">
              <div>
                <label>{t('detail.displayName')} *</label>
                <input required value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
              </div>
              <div>
                <label>{t('detail.emailLabel')} *</label>
                <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </div>
            </div>
            <p className="mut sm">{t('detail.addMemberHint')}</p>
            <button className="btn" disabled={a.busy}>{a.busy ? '…' : t('detail.addAndInvite')}</button>
          </form>

          <div className="card mt row between">
            <div>
              <h3 style={{ marginBottom: '.3rem' }}>{t('detail.readyToStart')}</h3>
              <p className="mut sm" style={{ margin: 0 }}>
                {rows.length < 2 ? t('detail.needTwoMembers') : t('detail.readyToStartDesc')}
              </p>
            </div>
            <button className="btn" disabled={a.busy || rows.length < 2} onClick={() => setConfirmStart(true)}>
              {t('detail.startBtn')}
            </button>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmDel}
        title={t('detail.removeConfirm')}
        message={confirmDel ? t('detail.removeDesc', { name: confirmDel.displayName }) : ''}
        confirmText={t('detail.remove')}
        cancelText={t('common.cancel')}
        danger
        onConfirm={() => removeMember(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />

      <ConfirmModal
        open={confirmStart}
        title={t('detail.startBtn')}
        message={t('detail.startConfirm')}
        confirmText={t('detail.startBtn')}
        cancelText={t('common.cancel')}
        onConfirm={start}
        onCancel={() => setConfirmStart(false)}
      />
    </>
  );
}

function Contributions({ t: tontine, manage, tick, reload }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], meta: null });
  const [status, setStatus] = useState('');
  const [confirmCash, setConfirmCash] = useState(null);
  const a = useAction();

  useEffect(() => {
    api(`/contributions${qs({ tontineId: tontine.id, page, status, limit: 15 })}`).then(setRes).catch(() => {});
  }, [tontine.id, page, status, tick]);

  const cash = async (c) => {
    setConfirmCash(null);
    if (await a.run(() => api('/payments/cash', { method: 'POST', body: { contributionId: c.id } }))) {
      toast(t('common.success'), 'success');
      reload();
    }
  };

  if (tontine.status === 'draft') return <Empty>{t('detail.draftContributions')}</Empty>;

  return (
    <>
      <div className="card">
        <div className="row between">
          <Msg>{a.error}</Msg>
          <select style={{ width: 'auto' }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('detail.allStatuses')}</option>
            <option value="pending">{t('detail.pending')}</option>
            <option value="paid">{t('detail.paid')}</option>
          </select>
        </div>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('detail.name')}</th>
                <th>{t('detail.amount')}</th>
                <th>{t('detail.status')}</th>
                <th>{t('detail.paidOn')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {res.data.map((c) => (
                <tr key={c.id}>
                  <td>#{c.roundNumber}</td>
                  <td>{c.memberName}</td>
                  <td>{money(c.amountDue, tontine.currency)}</td>
                  <td><Badge v={c.status} /></td>
                  <td>{fdatetime(c.paidAt)}</td>
                  <td className="row">
                    {c.status === 'pending' && manage && (
                      <button className="btn ghost sm" disabled={a.busy} onClick={() => setConfirmCash(c)}>
                        {t('detail.cash')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {res.data.length === 0 && <Empty>{t('detail.noContributions')}</Empty>}
        <Pager meta={res.meta} onPage={setPage} />
      </div>

      <ConfirmModal
        open={!!confirmCash}
        title={t('detail.cash')}
        message={confirmCash ? t('detail.cashConfirm', { amount: money(confirmCash.amountDue, tontine.currency), name: confirmCash.memberName }) : ''}
        confirmText={t('detail.cash')}
        cancelText={t('common.cancel')}
        onConfirm={() => cash(confirmCash)}
        onCancel={() => setConfirmCash(null)}
      />
    </>
  );
}

function History({ t: tontine, manage, tick, reload }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], meta: null });
  const a = useAction();
  const file = useRef(null);
  const [target, setTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmReverse, setConfirmReverse] = useState(null);
  const [reverseReason, setReverseReason] = useState('');

  useEffect(() => {
    api(`/transactions${qs({ tontineId: tontine.id, page, limit: 15 })}`).then(setRes).catch(() => {});
  }, [tontine.id, page, tick]);

  const upload = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f || !target) return;
    const fd = new FormData(); fd.append('file', f);
    await a.run(() => api(`/transactions/${target}/proof`, { method: 'POST', body: fd }), t('common.success'));
  };

  const show = async (id) => {
    const r = await a.run(() => api(`/transactions/${id}`));
    if (r) setDetail(r.data);
  };

  const reverse = async () => {
    if (!reverseReason) return;
    const txn = confirmReverse;
    setConfirmReverse(null);
    const reason = reverseReason;
    setReverseReason('');
    if (await a.run(() => api(`/transactions/${txn.id}/reverse`, { method: 'POST', body: { reason } }), t('detail.txnCancelled'))) {
      reload();
    }
  };

  return (
    <div className="card">
      <Msg>{a.error}</Msg>
      <Msg kind="ok">{a.info}</Msg>
      <input ref={file} type="file" accept=".jpg,.jpeg,.png,.pdf" hidden onChange={upload} />
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>{t('detail.txnNumber')}</th>
              <th>{t('detail.date')}</th>
              <th>{t('detail.type')}</th>
              <th>{t('detail.name')}</th>
              <th>{t('detail.amount')}</th>
              <th>{t('detail.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {res.data.map((x) => (
              <tr key={x.id}>
                <td><code>{x.txnNumber}</code></td>
                <td>{fdatetime(x.createdAt)}</td>
                <td>{t(`type.${x.type}`)} · <small className="mut">{t(`type.${x.method}`)}</small></td>
                <td>{x.memberName || '—'}</td>
                <td>{money(x.amount, x.currency)}</td>
                <td><Badge v={x.status} /></td>
                <td className="row">
                  <button className="btn ghost sm" onClick={() => show(x.id)}>{t('detail.details')}</button>
                  <button className="btn ghost sm" onClick={() => { setTarget(x.id); file.current.click(); }}>{t('detail.proof')}</button>
                  {manage && x.status === 'validated' && x.type !== 'reversal' && (
                    <button className="btn danger sm" onClick={() => { setConfirmReverse(x); setReverseReason(''); }}>
                      {t('detail.cancel')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {res.data.length === 0 && <Empty>{t('detail.noTransactions')}</Empty>}
      <Pager meta={res.meta} onPage={setPage} />

      {detail && (
      <div className="modal-backdrop" onClick={() => setDetail(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <h3>{detail.txnNumber}</h3>
          <div style={{ display: 'grid', gap: '.6rem', marginTop: '.8rem' }}>
            <div className="row between">
              <span className="mut sm">{t('detail.type')}</span>
              <span><Badge v={detail.type} /></span>
            </div>
            <div className="row between">
              <span className="mut sm">{t('detail.amount')}</span>
              <b style={{ color: 'var(--gold2)' }}>{money(detail.amount, detail.currency)}</b>
            </div>
            <div className="row between">
              <span className="mut sm">{t('detail.status')}</span>
              <Badge v={detail.status} />
            </div>
            <div className="row between">
              <span className="mut sm">{t('detail.date')}</span>
              <span>{fdatetime(detail.createdAt)}</span>
            </div>
            {detail.note && (
              <div>
                <div className="mut sm">{t('common.optional')}</div>
                <p style={{ margin: 0 }}>{detail.note}</p>
              </div>
            )}
            <div>
              <div className="mut sm" style={{ marginBottom: '.4rem' }}>{t('detail.proof')}</div>
              {detail.proofs.length ? (
                detail.proofs.map((p) => (
                  <a key={p.id} href={`/api/transactions/${detail.id}/proof/${p.id}`} target="_blank" rel="noreferrer noopener" className="btn ghost sm" style={{ marginRight: '.4rem' }}>
                    📎 {p.originalName}
                  </a>
                ))
              ) : (
                <span className="mut">{t('detail.noProof')}</span>
              )}
            </div>
          </div>
          <button className="btn mt" onClick={() => setDetail(null)} style={{ width: '100%' }}>
            {t('common.close')}
          </button>
        </div>
      </div>
    )}

      {/* Modal pour annulation */}
      <div className={`modal-backdrop ${confirmReverse ? 'open' : ''}`} style={{ display: confirmReverse ? 'grid' : 'none' }} onClick={() => setConfirmReverse(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>{t('detail.cancel')}</h3>
          <label>{t('detail.cancelReason')}</label>
          <input
            type="text"
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            autoFocus
            placeholder="..."
          />
          <div className="row between mt" style={{ gap: '.6rem' }}>
            <button className="btn ghost" onClick={() => setConfirmReverse(null)}>
              {t('common.cancel')}  {/* Bouton gris qui ferme */}
            </button>
            <button className="btn danger" onClick={reverse} disabled={!reverseReason}>
              {t('detail.confirmCancel')}  {/* Bouton rouge avec libellé clair */}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}