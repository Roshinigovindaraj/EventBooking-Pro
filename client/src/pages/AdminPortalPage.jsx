import React from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, Users, XCircle } from 'lucide-react';
import { apiRequest } from '../services/apiClient.js';

const title = item => item.title || item.name || item.applicant?.name || 'Submitted record';
const statusLabel = value => String(value || '').replaceAll('_', ' ');

export default function AdminPortalPage() {
  const [data, setData] = React.useState({ users:[], applications:[], events:[], venues:[], logs:[] });
  const [busy, setBusy] = React.useState(true);
  const [reviewing, setReviewing] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const [users, applications, events, venues, logs] = await Promise.all(['/admin/users','/admin/applications','/organizer/events','/venue-owner/venues','/admin/audit-logs'].map(path => apiRequest(path)));
      setData({ users:users.items || [], applications:applications.items || [], events:events.items || [], venues:venues.items || [], logs:logs.items || [] }); setError('');
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);
  const approvals = [['Applications',data.applications],['Events',data.events],['Venues',data.venues]].flatMap(([type,items]) => items.filter(item => ['pending','pending_review'].includes(item.status)).map(item => ({ type,item })));
  const review = async ({ type,item }, decision) => {
    setReviewing(item._id); setError(''); setMessage('');
    try { await apiRequest(`/admin/${type.toLowerCase()}/${item._id}/review`, { method:'POST', body:JSON.stringify({ decision }) }); setMessage(`${title(item)} was ${decision}.`); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setReviewing(''); }
  };
  return <div className="admin-console">
    <section className="admin-summary"><article><Users/><span><b>{data.users.length}</b><small>Users</small></span></article><article><ShieldCheck/><span><b>{approvals.length}</b><small>Pending approvals</small></span></article><article><CheckCircle2/><span><b>{data.events.filter(item => item.status === 'published').length}</b><small>Published events</small></span></article><article><RefreshCw/><span><b>{data.logs.length}</b><small>Audit records</small></span></article></section>
    {error && <p className="role-error" role="alert">{error}</p>}{message && <p className="role-success"><CheckCircle2/> {message}</p>}
    <section className="admin-approvals"><header><div><p>REVIEW QUEUE</p><h2>Pending approvals</h2><small>New organizer applications, events, and venues appear here automatically.</small></div><button disabled={busy} onClick={load}><RefreshCw/> {busy ? 'Loading…' : 'Refresh'}</button></header>{approvals.length ? <div className="approval-grid">{approvals.map(record => { const { type,item } = record; return <article key={`${type}-${item._id}`}>{item.images?.[0] && <img src={item.images[0]} alt=""/>}<div className="approval-copy"><span className="approval-type">{type.replace(/s$/, '')}</span><h3>{title(item)}</h3><p>{item.description || item.details?.description || [item.applicant?.name,item.applicant?.email].filter(Boolean).join(' · ') || 'Waiting for administrator review.'}</p><dl>{item.startsAt && <div><dt>Date</dt><dd>{new Date(item.startsAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</dd></div>}{item.category && <div><dt>Category</dt><dd>{item.category} · {item.subcategory}</dd></div>}{item.location?.city && <div><dt>Location</dt><dd>{item.venueName || item.location.city}</dd></div>}<div><dt>Status</dt><dd>{statusLabel(item.status)}</dd></div></dl><div className="role-review"><button disabled={reviewing === item._id} onClick={() => review(record,'approved')}><CheckCircle2/> {reviewing === item._id ? 'Working…' : 'Approve'}</button><button disabled={reviewing === item._id} onClick={() => review(record,'rejected')}><XCircle/> Reject</button></div></div></article>})}</div> : <div className="approval-empty"><CheckCircle2/><h3>All caught up</h3><p>No approvals are waiting.</p></div>}</section>
    <section className="admin-records"><h2>Recent platform records</h2><div>{[['Users',data.users],['Events',data.events],['Venues',data.venues],['Audit log',data.logs]].map(([name,items]) => <article key={name}><header><b>{name}</b><span>{items.length}</span></header>{items.slice(0,6).map(item => <p key={item._id}><span><b>{title(item)}</b><small>{statusLabel(item.status || item.action || item.email)}</small></span><CheckCircle2/></p>)}{!items.length && <small>No records yet.</small>}</article>)}</div></section>
  </div>;
}
