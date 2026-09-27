import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, money, fdate, fdatetime, qs } from '../api.js';
import { Tilt } from '../components/Fx.jsx';
import { Badge, Empty, Msg, Pager, useAction, label, SkeletonTable, ConfirmModal, toast } from '../components/ui.jsx';
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
    ['tours', '📅 Tours'],
    ['membres', '👥 Membres'],
    ['cotisations', '💰 Cotisations'],
    ['historique', '📜 Historique'],
  ];

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
            {money(tontine.contributionAmount, tontine.currency)} · {t(`freq.${tontine.frequency}`)} · début {fdate(tontine.startDate)}
          </p>
          {tontine.description && <p className="mut sm" style={{ marginTop: '.5rem' }}>{tontine.description}</p>}
        </div>
        <div className="row" style={{ gap: '.5rem' }}>
          <button
            className="btn ghost"
            onClick={() => exportTontinePDF(tontine, tontine.id)}
            title="Exporter en PDF"
          >
            <Icons.Download size={16} /> PDF
          </button>
          {(tontine.myRole === 'manager' || tontine.myRole === 'admin') && ['completed', 'draft'].includes(tontine.status) && (
            <button className="btn ghost" onClick={async () => {
              if (confirm('Archiver cette tontine ?')) {
                await api(`/tontines/${id}/archive`, { method: 'POST', body: {} }).catch((e) => alert(e.message));
                nav('/app/tontines');
              }
            }}>Archiver</button>
          )}
        </div>
      </div>

      <div className="grid g4 mt">
        {[
          ['Membres', tontine.memberCount],
          ['Tours versés', `${tontine.roundsDone}/${tontine.roundsTotal}`],
          ['Total collecté', money(tontine.collected, tontine.currency)],
          ['Total versé', money(tontine.paidOut, tontine.currency)],
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
    </>
  );
}

function Rounds({ t: tontine, manage, tick, reload }) {
  const [rounds, setR] = useState([]);
  const a = useAction();
  useEffect(() => { api(`/tontines/${tontine.id}/rounds`).then((r) => setR(r.data)).catch(() => {}); }, [tontine.id, tick]);

  if (tontine.status === 'draft') return <Empty>Le calendrier des tours est généré au démarrage de la tontine (onglet Membres).</Empty>;

  return (
    <div className="card scroll">
      <Msg>{a.error}</Msg>
      <table>
        <thead>
          <tr><th>Tour</th><th>Bénéficiaire</th><th>Échéance</th><th>Cotisations</th><th>Statut</th><th /></tr>
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
                  <button className="btn sm" disabled={a.busy} onClick={async () => {
                    if (confirm(`Verser ${money(r.collected, tontine.currency)} à ${r.beneficiaryName} ?`)
                      && await a.run(() => api('/payments/payout', { method: 'POST', body: { tontineId: tontine.id, roundId: r.id } }))) reload();
                  }}>Verser</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Members({ t: tontine, reload }) {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ email: '', displayName: '' });
  const [confirmDel, setConfirmDel] = useState(null);
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
      toast('Membre retiré', 'success');
      load();
      reload?.();
    }
  };

  // ✅ Ajout d'un membre AVEC email d'invitation automatique
  const submitAdd = async (e) => {
    e.preventDefault();
    const r = await a.run(() => api('/members', {
      method: 'POST',
      body: { tontineId: tontine.id, ...f },
    }));
    if (r) {
      toast(r.data.message, r.data.emailSent ? 'success' : 'info');
      setF({ email: '', displayName: '' });
      load();
    }
  };

  return (
    <>
      <div className="card scroll">
        <Msg>{a.error}</Msg>
        <Msg kind="ok">{a.info}</Msg>
        <table>
          <thead>
            <tr><th>Ordre</th><th>Nom</th><th>Email</th><th>Rôle</th><th /></tr>
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
                <td>{m.displayName} {!m.linked && <small className="mut">(invité)</small>}</td>
                <td className="mut">{m.email || '—'}</td>
                <td>
                  {canEdit && tontine.status !== 'archived' ? (
                    <select value={m.tontineRole} onChange={async (e) => {
                      if (await a.run(() => api(`/members/${m.id}`, { method: 'PATCH', body: { tontineRole: e.target.value } }))) { load(); reload?.(); }
                    }}>
                      {['member', 'treasurer', 'manager'].map((r) => <option key={r} value={r}>{label(r)}</option>)}
                    </select>
                  ) : <Badge v={m.tontineRole} />}
                </td>
                <td>
                  {canEdit && draft && m.tontineRole !== 'manager' && (
                    <button
                      className="btn ghost sm"
                      onClick={() => setConfirmDel(m)}
                      style={{ color: 'var(--red)' }}
                      title="Retirer"
                    >
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
            <h3>Ajouter un membre</h3>
            <div className="grid g2">
              <div>
                <label>Nom affiché *</label>
                <input required value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
              </div>
              <div>
                <label>Email *</label>
                <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </div>
            </div>
            <p className="mut sm">
              📧 Un email d'invitation sera envoyé automatiquement au membre.
              S'il n'a pas encore de compte, il sera rattaché dès son inscription avec cet email.
            </p>
            <button className="btn" disabled={a.busy}>
              {a.busy ? 'Envoi…' : 'Ajouter et envoyer l\'invitation'}
            </button>
          </form>

          <div className="card mt row between">
            <div>
              <h3 style={{ marginBottom: '.3rem' }}>Prêt à démarrer ?</h3>
              <p className="mut sm" style={{ margin: 0 }}>
                {rows.length < 2 ? 'Ajoutez au moins 2 membres pour démarrer.'
                  : 'Après le démarrage, membres, ordre et montant ne peuvent plus changer.'}
              </p>
            </div>
            <button className="btn" disabled={a.busy || rows.length < 2} onClick={async () => {
              if (confirm('Démarrer la tontine ? Cette action est définitive.')
                && await a.run(() => api(`/tontines/${tontine.id}/start`, { method: 'POST', body: {} }))) reload?.();
            }}>Démarrer</button>
          </div>
        </>
      )}

      <ConfirmModal
        open={!!confirmDel}
        title="Retirer ce membre ?"
        message={confirmDel ? `« ${confirmDel.displayName} » sera retiré de la tontine.` : ''}
        confirmText="Retirer"
        cancelText="Annuler"
        danger
        onConfirm={() => removeMember(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </>
  );
}

// ✅ Paiement Kkiapay intégré dans PayOnline
export function PayOnline({ contributionId, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('/payments/initiate', { method: 'POST', body: { contributionId } });
      const data = r.data;

      if (data.mode === 'kkiapay') {
        if (!window.Kkiapay) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.kkiapay.me/k.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        window.openKkiapayWidget({
          amount: data.amount,
          key: data.publicKey,
          sandbox: data.sandbox,
          data: { contributionId: data.contributionId, reference: data.reference },
          theme: '#f2b632',
          name: 'Tontine',
        });

        window.addSuccessListener?.(() => {
          toast('Paiement en cours de traitement…', 'info');
          onDone?.();
          setTimeout(() => window.location.reload(), 2000);
        });
        window.addFailedListener?.(() => setError('Le paiement a échoué'));
        window.addPendingListener?.(() => setError('Paiement en attente'));
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn sm" disabled={busy} onClick={pay}>
        {busy ? '…' : 'Payer en ligne'}
      </button>
      {error && <small className="mut" style={{ color: 'var(--red)' }}> {error}</small>}
    </>
  );
}

function Contributions({ t: tontine, manage, tick, reload }) {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], meta: null });
  const [status, setStatus] = useState('');
  const a = useAction();

  useEffect(() => {
    api(`/contributions${qs({ tontineId: tontine.id, page, status, limit: 15 })}`).then(setRes).catch(() => {});
  }, [tontine.id, page, status, tick]);

  if (tontine.status === 'draft') return <Empty>Les cotisations sont créées au démarrage de la tontine.</Empty>;

  return (
    <div className="card">
      <div className="row between">
        <Msg>{a.error}</Msg>
        <select style={{ width: 'auto' }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="paid">Payées</option>
        </select>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Tour</th><th>Membre</th><th>Montant</th><th>Statut</th><th>Payée le</th><th /></tr>
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
                    <button className="btn ghost sm" disabled={a.busy} onClick={async () => {
                      if (confirm(`Enregistrer ${money(c.amountDue, tontine.currency)} en espèces pour ${c.memberName} ?`)
                        && await a.run(() => api('/payments/cash', { method: 'POST', body: { contributionId: c.id } }))) reload();
                    }}>Espèces</button>
                  )}
                  {c.status === 'pending' && c.isMine && <PayOnline contributionId={c.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {res.data.length === 0 && <Empty>Aucune cotisation.</Empty>}
      <Pager meta={res.meta} onPage={setPage} />
    </div>
  );
}

function History({ t: tontine, manage, tick, reload }) {
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ data: [], meta: null });
  const a = useAction();
  const file = useRef(null);
  const [target, setTarget] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api(`/transactions${qs({ tontineId: tontine.id, page, limit: 15 })}`).then(setRes).catch(() => {});
  }, [tontine.id, page, tick]);

  const upload = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f || !target) return;
    const fd = new FormData(); fd.append('file', f);
    await a.run(() => api(`/transactions/${target}/proof`, { method: 'POST', body: fd }), 'Justificatif ajouté');
  };

  const show = async (id) => {
    const r = await a.run(() => api(`/transactions/${id}`));
    if (r) setDetail(r.data);
  };

  return (
    <div className="card">
      <Msg>{a.error}</Msg>
      <Msg kind="ok">{a.info}</Msg>
      <input ref={file} type="file" accept=".jpg,.jpeg,.png,.pdf" hidden onChange={upload} />
      <div className="scroll">
        <table>
          <thead>
            <tr><th>N°</th><th>Date</th><th>Type</th><th>Membre</th><th>Montant</th><th>Statut</th><th /></tr>
          </thead>
          <tbody>
            {res.data.map((x) => (
              <tr key={x.id}>
                <td><code>{x.txnNumber}</code></td>
                <td>{fdatetime(x.createdAt)}</td>
                <td>{label(x.type)} · <small className="mut">{label(x.method)}</small></td>
                <td>{x.memberName || '—'}</td>
                <td>{money(x.amount, x.currency)}</td>
                <td><Badge v={x.status} /></td>
                <td className="row">
                  <button className="btn ghost sm" onClick={() => show(x.id)}>Détails</button>
                  <button className="btn ghost sm" onClick={() => { setTarget(x.id); file.current.click(); }}>Justif.</button>
                  {manage && x.status === 'validated' && x.type !== 'reversal' && (
                    <button className="btn danger sm" onClick={async () => {
                      const reason = prompt('Motif de l\'annulation (obligatoire) :');
                      if (reason && await a.run(() => api(`/transactions/${x.id}/reverse`, { method: 'POST', body: { reason } }), 'Transaction annulée')) reload();
                    }}>Annuler</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {res.data.length === 0 && <Empty>Aucune transaction.</Empty>}
      <Pager meta={res.meta} onPage={setPage} />

      {detail && (
        <div className="msg ok">
          <b>{detail.txnNumber}</b> — {label(detail.type)} de {money(detail.amount, detail.currency)} ({label(detail.status)})
          {detail.note && <> · {detail.note}</>}
          <br />
          {detail.proofs.length
            ? detail.proofs.map((p) => (
              <a key={p.id} href={`/api/transactions/${detail.id}/proof/${p.id}`} target="_blank" rel="noreferrer noopener">
                {p.originalName}{' '}
              </a>
            ))
            : <span className="mut">Aucun justificatif</span>}
          <button className="btn ghost sm" onClick={() => setDetail(null)}>Fermer</button>
        </div>
      )}
    </div>
  );
}