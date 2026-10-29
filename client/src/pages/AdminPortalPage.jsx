import React from 'react';
import {
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
  Eye,
  X,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';
import { apiRequest } from '../services/apiClient.js';

const title = item => item.title || item.name || item.details?.organizationName || item.applicant?.name || 'Submitted record';
const statusLabel = value => String(value || '').replaceAll('_', ' ');

export default function AdminPortalPage() {
  const [data, setData] = React.useState({ users: [], applications: [], events: [], venues: [], logs: [] });
  const [busy, setBusy] = React.useState(true);
  const [reviewing, setReviewing] = React.useState('');
  const [deletingEventId, setDeletingEventId] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [modalError, setModalError] = React.useState('');
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [feedback, setFeedback] = React.useState('');

  const closeModal = React.useCallback(() => {
    setSelectedRecord(null);
    setFeedback('');
    setModalError('');
  }, []);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const [users, applications, events, venues, logs] = await Promise.all(
        ['/admin/users', '/admin/applications', '/admin/events', '/admin/venues', '/admin/audit-logs'].map(path => apiRequest(path))
      );
      setData({
        users: users.items || [],
        applications: applications.items || [],
        events: events.items || [],
        venues: venues.items || [],
        logs: logs.items || []
      });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const removeEvent = async (event) => {
    const isCompleted = event.isCompleted || (event.endsAt && new Date(event.endsAt) <= new Date());
    const confirmMessage = isCompleted
      ? `Are you sure you want to permanently remove completed event "${event.title}"?`
      : `Warning: This event has not ended yet. Are you sure you want to permanently remove event "${event.title}"?`;

    if (!window.confirm(confirmMessage)) return;

    setDeletingEventId(event._id);
    setError('');
    setMessage('');
    try {
      const res = await apiRequest(`/admin/events/${event._id}`, { method: 'DELETE' });
      setMessage(res.message || `Event "${event.title}" removed successfully.`);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to remove event.');
    } finally {
      setDeletingEventId('');
    }
  };

  const [deletingVenueId, setDeletingVenueId] = React.useState('');

  const removeVenue = async (venue) => {
    const confirmMessage = `Are you sure you want to permanently remove venue "${venue.name}"? This will also remove associated reservations and operational tasks.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingVenueId(venue._id);
    setError('');
    setMessage('');
    try {
      const res = await apiRequest(`/admin/venues/${venue._id}`, { method: 'DELETE' });
      setMessage(res.message || `Venue "${venue.name}" removed successfully.`);
      window.dispatchEvent(new Event('eventoria:data-changed'));
      await load();
    } catch (err) {
      setError(err.message || 'Failed to remove venue.');
    } finally {
      setDeletingVenueId('');
    }
  };

  React.useEffect(() => {
    load();
  }, [load]);

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal]);

  const approvals = [
    ['Applications', data.applications],
    ['Events', data.events],
    ['Venues', data.venues]
  ].flatMap(([type, items]) =>
    items
      .filter(item => ['pending', 'pending_review'].includes(item.status))
      .map(item => ({ type, item }))
  );

  const review = async (record, decision, customFeedback = '') => {
    const { type, item } = record;
    setReviewing(item._id);
    setModalError('');
    setError('');
    setMessage('');
    try {
      await apiRequest(`/admin/${type.toLowerCase()}/${item._id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, feedback: customFeedback || undefined })
      });
      const actionText = decision === 'approved' ? 'authorized and approved' : 'rejected';
      setMessage(`${title(item)} was successfully ${actionText}.`);
      closeModal();
      await load();
    } catch (requestError) {
      const msg = requestError.message || 'Action failed. Please try again.';
      setModalError(msg);
      setError(msg);
    } finally {
      setReviewing('');
    }
  };

  const openModal = record => {
    setSelectedRecord(record);
    setFeedback('');
    setModalError('');
  };

  return (
    <div className="admin-console">
      {/* Platform Summary Cards */}
      <section className="admin-summary">
        <article>
          <Users />
          <span>
            <b>{data.users.length}</b>
            <small>Users</small>
          </span>
        </article>
        <article>
          <ShieldCheck />
          <span>
            <b>{approvals.length}</b>
            <small>Pending approvals</small>
          </span>
        </article>
        <article>
          <CheckCircle2 />
          <span>
            <b>{data.events.filter(item => item.status === 'published').length}</b>
            <small>Published events</small>
          </span>
        </article>
        <article>
          <RefreshCw />
          <span>
            <b>{data.logs.length}</b>
            <small>Audit records</small>
          </span>
        </article>
      </section>

      {error && (
        <p className="role-error" role="alert">
          <AlertCircle size={18} /> {error}
        </p>
      )}
      {message && (
        <p className="role-success">
          <CheckCircle2 size={18} /> {message}
        </p>
      )}

      {/* Pending Approvals Review Queue */}
      <section className="admin-approvals">
        <header>
          <div>
            <p>REVIEW QUEUE</p>
            <h2>Pending approvals</h2>
            <small>Review organizer applications, events, and venues. Inspect details before authorizing.</small>
          </div>
          <button disabled={busy} onClick={load} className="admin-refresh-btn">
            <RefreshCw size={16} className={busy ? 'admin-spin' : ''} /> {busy ? 'Loading…' : 'Refresh'}
          </button>
        </header>

        {approvals.length ? (
          <div className="approval-grid">
            {approvals.map(record => {
              const { type, item } = record;
              const hasImage = Boolean(item.images?.[0]);
              const isApplication = type === 'Applications';
              const orgName = item.details?.organizationName;
              const applicantName = item.applicant?.name;
              const applicantEmail = item.applicant?.email;

              return (
                <article key={`${type}-${item._id}`} className={`approval-card ${hasImage ? 'has-image' : 'no-image'}`}>
                  {hasImage && <img src={item.images[0]} alt={title(item)} className="approval-card-img" />}
                  <div className="approval-copy">
                    <div className="approval-copy-header">
                      <span className="approval-type">
                        {isApplication ? `${item.type || 'organizer'} application` : type.replace(/s$/, '')}
                      </span>
                      <span className="approval-status-pill">{statusLabel(item.status)}</span>
                    </div>

                    <h3 className="approval-card-title" onClick={() => openModal(record)} title="Click to check full details">
                      {isApplication && orgName ? orgName : title(item)}
                    </h3>

                    {isApplication && applicantName && (
                      <p className="approval-applicant-line">
                        <strong>Applicant:</strong> {applicantName} {applicantEmail ? `(${applicantEmail})` : ''}
                      </p>
                    )}

                    {isApplication && (item.details?.eventCategory || item.details?.plannedEventTitle) && (
                      <div style={{ margin: '0.4rem 0', padding: '0.4rem 0.65rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.82rem', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                        <strong>🎯 Proposed Event:</strong> {item.details?.eventCategory} {item.details?.eventSubcategory ? `(${item.details.eventSubcategory})` : ''} {item.details?.plannedEventTitle ? `— "${item.details.plannedEventTitle}"` : ''}
                      </div>
                    )}

                    {isApplication && (item.type === 'venue_owner' || item.details?.venueName) && (
                      <div style={{ margin: '0.4rem 0', padding: '0.4rem 0.65rem', background: '#ecfdf5', borderRadius: '6px', fontSize: '0.82rem', border: '1px solid #a7f3d0', color: '#065f46' }}>
                        <strong>🏰 Proposed Venue:</strong> {item.details?.venueName || 'Venue'} · {item.details?.type || 'Space'} ({item.details?.city || 'Location'}) {item.details?.capacity ? `— Capacity: ${item.details.capacity}` : ''} {item.details?.pricePerHour ? `· ₹${item.details.pricePerHour}/hr` : ''}
                      </div>
                    )}

                    <p className="approval-card-desc">
                      {item.details?.description || item.description || 'Waiting for administrator review.'}
                    </p>

                    <dl className="approval-card-meta">
                      {item.startsAt && (
                        <div>
                          <dt>Date</dt>
                          <dd>{new Date(item.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
                        </div>
                      )}
                      {item.category && (
                        <div>
                          <dt>Category</dt>
                          <dd>{item.category} · {item.subcategory}</dd>
                        </div>
                      )}
                      {(item.location?.city || item.details?.address) && (
                        <div>
                          <dt>Location</dt>
                          <dd>{item.venueName || item.location?.city || item.details?.address?.split(',')[0]}</dd>
                        </div>
                      )}
                      {item.details?.phone && (
                        <div>
                          <dt>Phone</dt>
                          <dd>{item.details.phone}</dd>
                        </div>
                      )}
                      {item.details?.website && (
                        <div>
                          <dt>Website</dt>
                          <dd>
                            <a href={item.details.website} target="_blank" rel="noreferrer" className="admin-inline-link">
                              Link <ExternalLink size={11} />
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="role-review-actions">
                      <button
                        type="button"
                        className="btn-check-details"
                        onClick={() => openModal(record)}
                        title="Inspect full details, credentials & authorize"
                      >
                        <Eye size={16} /> Check Details
                      </button>

                      <button
                        type="button"
                        className="btn-quick-approve"
                        disabled={reviewing === item._id}
                        onClick={() => review(record, 'approved')}
                        title="Approve & Authorize immediately"
                      >
                        <CheckCircle2 size={16} />
                        {reviewing === item._id ? 'Saving…' : 'Approve'}
                      </button>

                      <button
                        type="button"
                        className="btn-quick-reject"
                        disabled={reviewing === item._id}
                        onClick={() => review(record, 'rejected')}
                        title="Reject application"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="approval-empty">
            <CheckCircle2 size={36} />
            <h3>All caught up</h3>
            <p>No pending approvals are waiting right now.</p>
          </div>
        )}
      </section>

      {/* Recent Platform Records */}
      <section className="admin-records">
        <h2>Recent platform records</h2>
        <div>
          {[
            ['Users', data.users],
            ['Events', data.events],
            ['Venues', data.venues],
            ['Audit log', data.logs]
          ].map(([name, items]) => (
            <article key={name}>
              <header>
                <b>{name}</b>
                <span>{items.length}</span>
              </header>
              {items.slice(0, 6).map(item => (
                <p key={item._id || item.id}>
                  <span>
                    <b>{title(item)}</b>
                    <small>{statusLabel(item.status || item.action || item.email)}</small>
                  </span>
                  <CheckCircle2 size={16} />
                </p>
              ))}
              {!items.length && <small>No records yet.</small>}
            </article>
          ))}
        </div>
      </section>

      {/* Event Lifecycle & Removal Management */}
      <section className="admin-approvals" style={{ marginTop: '32px' }}>
        <header>
          <div>
            <p>EVENT LIFECYCLE OPERATIONS</p>
            <h2>Manage Platform Events & Cleanup</h2>
            <small>Inspect event sales and remove completed, past, or cancelled events from the platform.</small>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
            {data.events.length} total events
          </span>
        </header>

        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', margin: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Event</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Organizer</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Schedule</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Tickets Sold / Cap</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map(ev => {
                const isCompleted = ev.isCompleted || (ev.endsAt && new Date(ev.endsAt) <= new Date());
                const totalCap = ev.totalCapacity || (ev.ticketTypes || []).reduce((s, t) => s + (t.capacity || 0), 0);
                const totalSold = ev.totalSold || (ev.ticketTypes || []).reduce((s, t) => s + (t.sold || 0), 0);
                const isSoldOut = ev.isSoldOut || (totalCap > 0 && totalSold >= totalCap);

                return (
                  <tr key={ev._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <b style={{ color: '#0f172a', display: 'block', fontSize: '14px' }}>{ev.title}</b>
                      <small style={{ color: '#64748b' }}>{ev.category} · {ev.location?.city || ev.city}</small>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>{ev.organizer?.name || 'Organizer'}</span>
                      <small style={{ display: 'block', color: '#64748b' }}>{ev.organizer?.email}</small>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ display: 'block', color: '#1e293b' }}>
                        {ev.startsAt ? new Date(ev.startsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                      <small style={{ color: '#64748b' }}>
                        to {ev.endsAt ? new Date(ev.endsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </small>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: isCompleted ? '#f1f5f9' : '#ecfdf5',
                          color: isCompleted ? '#475569' : '#047857',
                          border: `1px solid ${isCompleted ? '#cbd5e1' : '#a7f3d0'}`
                        }}>
                          {isCompleted ? '✓ Completed' : '● Active / Upcoming'}
                        </span>
                        {isSoldOut && (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca'
                          }}>
                            SOLD OUT
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <b style={{ color: totalSold > 0 ? '#2563eb' : '#64748b' }}>{totalSold}</b> / {totalCap} tickets
                      {totalCap > 0 && (
                        <div style={{ width: '90px', height: '6px', background: '#e2e8f0', borderRadius: '4px', marginTop: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.round((totalSold / totalCap) * 100))}%`, height: '100%', background: isSoldOut ? '#dc2626' : '#2563eb' }} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={deletingEventId === ev._id}
                        onClick={() => removeEvent(ev)}
                        style={{
                          background: isCompleted ? '#fee2e2' : '#fff1f2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title={isCompleted ? 'Remove completed event from platform' : 'Remove event'}
                      >
                        <Trash2 size={14} />
                        {deletingEventId === ev._id ? 'Removing…' : isCompleted ? 'Remove Completed Event' : 'Remove Event'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!data.events.length && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                    No events currently registered on the platform.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Venue Lifecycle & Removal Management */}
      <section className="admin-approvals" style={{ marginTop: '32px' }}>
        <header>
          <div>
            <p>VENUE LIFECYCLE OPERATIONS</p>
            <h2>Manage Platform Venues & Cleanup</h2>
            <small>Inspect venue listings and remove outdated, closed, or discontinued venues from the platform.</small>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
            {data.venues.length} total venues
          </span>
        </header>

        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', margin: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Venue</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Owner</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Type & Location</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>Capacity & Rate</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.venues.map(v => {
                const priceFormatted = v.priceMinorPerHour ? `₹${Math.round(v.priceMinorPerHour / 100).toLocaleString('en-IN')}/hr` : '—';

                return (
                  <tr key={v._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <b style={{ color: '#0f172a', display: 'block', fontSize: '14px' }}>{v.name}</b>
                      <small style={{ color: '#64748b' }}>{v.description ? v.description.slice(0, 60) + '…' : 'Venue space'}</small>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 500, color: '#1e293b' }}>{v.owner?.name || 'Owner'}</span>
                      <small style={{ display: 'block', color: '#64748b' }}>{v.owner?.email || '—'}</small>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ display: 'block', color: '#1e293b', fontWeight: 500 }}>{v.type || 'Banquet'}</span>
                      <small style={{ color: '#64748b' }}>{v.location?.city || v.city || 'Tamil Nadu'}{v.location?.address ? `, ${v.location.address}` : ''}</small>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: v.status === 'published' ? '#ecfdf5' : v.status === 'pending_review' ? '#fffbeb' : '#f1f5f9',
                        color: v.status === 'published' ? '#047857' : v.status === 'pending_review' ? '#b45309' : '#475569',
                        border: `1px solid ${v.status === 'published' ? '#a7f3d0' : v.status === 'pending_review' ? '#fde68a' : '#cbd5e1'}`
                      }}>
                        {v.status || 'draft'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <b style={{ color: '#2563eb' }}>{v.capacity || 0}</b> guests
                      <small style={{ display: 'block', color: '#64748b' }}>{priceFormatted}</small>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={deletingVenueId === v._id}
                        onClick={() => removeVenue(v)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Remove venue permanently from platform"
                      >
                        <Trash2 size={14} />
                        {deletingVenueId === v._id ? 'Removing…' : 'Remove Venue'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!data.venues.length && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                    No venues currently registered on the platform.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comprehensive Application & Item Detail Modal */}
      {selectedRecord && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="admin-modal-header">
              <div>
                <span className="approval-type-pill">
                  {selectedRecord.type === 'Applications'
                    ? `${selectedRecord.item.type || 'organizer'} Application`
                    : `${selectedRecord.type.replace(/s$/, '')} Submission`}
                </span>
                <h2>{title(selectedRecord.item)}</h2>
                {selectedRecord.item.details?.organizationName && (
                  <p className="admin-modal-org">
                    <Building2 size={15} /> {selectedRecord.item.details.organizationName}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeModal}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </header>

            <div className="admin-modal-scroll-body">
              {/* If it has cover/banner image */}
              {selectedRecord.item.images?.[0] && (
                <div className="admin-modal-banner">
                  <img src={selectedRecord.item.images[0]} alt={title(selectedRecord.item)} />
                </div>
              )}

              {/* Application Details */}
              {selectedRecord.type === 'Applications' && (
                <div className="admin-detail-sections">
                  {/* Submitter details */}
                  <div className="admin-detail-card">
                    <h4>
                      <Users size={16} /> Applicant Information
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Full Name</span>
                        <strong>{selectedRecord.item.applicant?.name || 'Unknown'}</strong>
                      </div>
                      <div>
                        <span>Email Address</span>
                        <strong>
                          {selectedRecord.item.applicant?.email ? (
                            <a href={`mailto:${selectedRecord.item.applicant.email}`} className="admin-contact-link">
                              <Mail size={13} /> {selectedRecord.item.applicant.email}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Contact Phone</span>
                        <strong>
                          {selectedRecord.item.details?.phone ? (
                            <a href={`tel:${selectedRecord.item.details.phone}`} className="admin-contact-link">
                              <Phone size={13} /> {selectedRecord.item.details.phone}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Current Platform Role</span>
                        <strong>{selectedRecord.item.applicant?.roles?.join(', ') || 'customer'}</strong>
                      </div>
                      <div>
                        <span>Account Status</span>
                        <strong className="admin-status-tag">
                          {selectedRecord.item.applicant?.status || 'active'}
                        </strong>
                      </div>
                      <div>
                        <span>Application Date</span>
                        <strong>
                          {selectedRecord.item.createdAt
                            ? new Date(selectedRecord.item.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })
                            : 'Recently'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Event or Proposed Venue */}
                  {selectedRecord.item.type === 'venue_owner' || selectedRecord.item.details?.venueName ? (
                    <div className="admin-detail-card" style={{ borderLeft: '4px solid #059669', background: '#f0fdf4' }}>
                      <h4 style={{ color: '#047857' }}>
                        <Building2 size={16} /> Proposed Venue Information
                      </h4>
                      <div className="admin-detail-grid">
                        <div>
                          <span>Venue Name</span>
                          <strong>{selectedRecord.item.details?.venueName || 'Venue'}</strong>
                        </div>
                        <div>
                          <span>Venue Type</span>
                          <strong>{selectedRecord.item.details?.type || 'Space'}</strong>
                        </div>
                        <div>
                          <span>City / Location</span>
                          <strong>{selectedRecord.item.details?.city || 'Not specified'}{selectedRecord.item.details?.address ? `, ${selectedRecord.item.details.address}` : ''}</strong>
                        </div>
                        <div>
                          <span>Guest Capacity</span>
                          <strong>{selectedRecord.item.details?.capacity || 'N/A'} Guests</strong>
                        </div>
                        <div>
                          <span>Rate / Hour</span>
                          <strong>₹{selectedRecord.item.details?.pricePerHour || '0'} / hr</strong>
                        </div>
                        <div>
                          <span>Amenities</span>
                          <strong>{Array.isArray(selectedRecord.item.details?.amenities) ? selectedRecord.item.details.amenities.join(', ') : selectedRecord.item.details?.amenities || 'Standard'}</strong>
                        </div>
                        {selectedRecord.item.details?.image && (
                          <div className="grid-full-width" style={{ marginTop: 8 }}>
                            <span>Venue Photo</span>
                            <img src={selectedRecord.item.details.image} alt="Venue" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 4 }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="admin-detail-card" style={{ borderLeft: '4px solid #2563eb', background: '#f8faff' }}>
                      <h4 style={{ color: '#1d4ed8' }}>
                        <CalendarDays size={16} /> Proposed Event & Specialization
                      </h4>
                      <div className="admin-detail-grid">
                        <div>
                          <span>Event Category</span>
                          <strong>{selectedRecord.item.details?.eventCategory || 'Entertainment / General'}</strong>
                        </div>
                        <div>
                          <span>Subcategory / Genre</span>
                          <strong>{selectedRecord.item.details?.eventSubcategory || 'Standard'}</strong>
                        </div>
                        <div className="grid-full-width">
                          <span>Proposed Event Concept</span>
                          <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
                            {selectedRecord.item.details?.plannedEventTitle || selectedRecord.item.details?.organizationName || 'Not specified'}
                          </strong>
                        </div>
                        <div>
                          <span>Target City / Market</span>
                          <strong>{selectedRecord.item.details?.targetCity || selectedRecord.item.details?.address || 'Not specified'}</strong>
                        </div>
                        <div>
                          <span>Expected Audience Scale</span>
                          <strong>{selectedRecord.item.details?.expectedAttendees || '100 - 500 attendees'}</strong>
                        </div>
                        <div>
                          <span>Event Format</span>
                          <strong>{selectedRecord.item.details?.eventType || 'In-person live event'}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Organization & Credentials */}
                  <div className="admin-detail-card">
                    <h4>
                      <Building2 size={16} /> Business & Legal Information
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Organization / Brand</span>
                        <strong>{selectedRecord.item.details?.organizationName || 'Not specified'}</strong>
                      </div>
                      <div>
                        <span>Website / Portfolio</span>
                        <strong>
                          {selectedRecord.item.details?.website ? (
                            <a
                              href={selectedRecord.item.details.website}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-contact-link"
                            >
                              {selectedRecord.item.details.website} <ExternalLink size={13} />
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div className="grid-full-width">
                        <span>Registered Business Address</span>
                        <strong>
                          {selectedRecord.item.details?.address ? (
                            <span className="admin-address-row">
                              <MapPin size={14} /> {selectedRecord.item.details.address}
                            </span>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>PAN / GST Number</span>
                        <strong>{selectedRecord.item.details?.panGst || 'Not provided'}</strong>
                      </div>
                      <div>
                        <span>Payout / Bank Account</span>
                        <strong>
                          {selectedRecord.item.details?.bankAccount ? (
                            <span className="admin-bank-row">
                              <CreditCard size={14} /> {selectedRecord.item.details.bankAccount}
                            </span>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Pitch / Bio Description */}
                  <div className="admin-detail-card">
                    <h4>
                      <FileText size={16} /> Organizer Proposal & Bio
                    </h4>
                    <div className="admin-detail-desc-box">
                      <p>{selectedRecord.item.details?.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Authorization Notice */}
                  <div className="admin-auth-notice">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Role Authorization on Approval:</strong>
                      <p>
                        Approving this application will immediately authorize{' '}
                        <b>{selectedRecord.item.applicant?.name}</b> with the{' '}
                        <b>
                          {selectedRecord.item.type === 'venue_owner' ? 'Venue Owner' : 'Event Organizer'}
                        </b>{' '}
                        role, allowing them to access management tools, submit events, and manage bookings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Details */}
              {selectedRecord.type === 'Events' && (
                <div className="admin-detail-sections">
                  <div className="admin-detail-card">
                    <h4>
                      <CalendarDays size={16} /> Event Details
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Category</span>
                        <strong>
                          {selectedRecord.item.category} · {selectedRecord.item.subcategory}
                        </strong>
                      </div>
                      <div>
                        <span>Starts At</span>
                        <strong>
                          {new Date(selectedRecord.item.startsAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </strong>
                      </div>
                      <div>
                        <span>Ends At</span>
                        <strong>
                          {new Date(selectedRecord.item.endsAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </strong>
                      </div>
                      <div>
                        <span>Location / Venue</span>
                        <strong>
                          {selectedRecord.item.venueName || selectedRecord.item.location?.city || 'TBD'}
                        </strong>
                      </div>
                      <div>
                        <span>Organizer</span>
                        <strong>
                          {selectedRecord.item.organizer?.name || 'Assigned organizer'}{' '}
                          {selectedRecord.item.organizer?.email ? `(${selectedRecord.item.organizer.email})` : ''}
                        </strong>
                      </div>
                      <div>
                        <span>Capacity</span>
                        <strong>{selectedRecord.item.capacity || 'Not limited'} attendees</strong>
                      </div>
                    </div>
                  </div>

                  {/* Ticket tiers */}
                  {selectedRecord.item.ticketTypes?.length > 0 && (
                    <div className="admin-detail-card">
                      <h4>
                        <CreditCard size={16} /> Ticket Pricing Tiers
                      </h4>
                      <div className="admin-ticket-list">
                        {selectedRecord.item.ticketTypes.map((tier, idx) => (
                          <div key={idx} className="admin-ticket-row">
                            <b>{tier.name}</b>
                            <span>₹{tier.price}</span>
                            <small>{tier.capacity} seats</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="admin-detail-card">
                    <h4>
                      <FileText size={16} /> Event Description
                    </h4>
                    <div className="admin-detail-desc-box">
                      <p>{selectedRecord.item.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Venue Details */}
              {selectedRecord.type === 'Venues' && (
                <div className="admin-detail-sections">
                  <div className="admin-detail-card">
                    <h4>
                      <Building2 size={16} /> Venue Details
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Venue Type</span>
                        <strong>{selectedRecord.item.type}</strong>
                      </div>
                      <div>
                        <span>City / Address</span>
                        <strong>
                          {selectedRecord.item.location?.city || selectedRecord.item.city},{' '}
                          {selectedRecord.item.location?.address || selectedRecord.item.address}
                        </strong>
                      </div>
                      <div>
                        <span>Capacity</span>
                        <strong>{selectedRecord.item.capacity} guests</strong>
                      </div>
                      <div>
                        <span>Hourly Price</span>
                        <strong>₹{selectedRecord.item.priceMinorPerHour / 100} / hr</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>
                          {selectedRecord.item.owner?.name || 'Owner'}{' '}
                          {selectedRecord.item.owner?.email ? `(${selectedRecord.item.owner.email})` : ''}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {selectedRecord.item.amenities?.length > 0 && (
                    <div className="admin-detail-card">
                      <h4>Amenities & Facilities</h4>
                      <div className="admin-amenities-tags">
                        {selectedRecord.item.amenities.map(a => (
                          <span key={a} className="admin-amenity-tag">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="admin-detail-card">
                    <h4>
                      <FileText size={16} /> Venue Description
                    </h4>
                    <div className="admin-detail-desc-box">
                      <p>{selectedRecord.item.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Feedback Input */}
              <div className="admin-modal-feedback-card">
                <label htmlFor="admin-review-feedback">
                  <b>Reviewer Feedback / Decision Notes</b>
                  <small>Optional instructions or remarks that will be saved with this review.</small>
                </label>
                <textarea
                  id="admin-review-feedback"
                  rows={3}
                  placeholder="Enter any feedback, approval notes, or rejection reasoning here..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>

            </div>

            <footer className="admin-modal-footer">
              {modalError && (
                <div className="admin-modal-error" role="alert" style={{ width: '100%', marginBottom: 12 }}>
                  <AlertCircle size={18} />
                  <span>{modalError}</span>
                </div>
              )}
              <div className="admin-modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeModal();
                  }}
                  disabled={Boolean(reviewing)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-reject"
                  disabled={Boolean(reviewing)}
                  onClick={(e) => {
                    e.stopPropagation();
                    review(selectedRecord, 'rejected', feedback);
                  }}
                >
                  {reviewing === selectedRecord.item._id ? (
                    <RefreshCw size={16} className="admin-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  {reviewing === selectedRecord.item._id ? 'Working…' : 'Reject'}
                </button>
                <button
                  type="button"
                  className="btn-modal-approve"
                  disabled={Boolean(reviewing)}
                  onClick={(e) => {
                    e.stopPropagation();
                    review(selectedRecord, 'approved', feedback);
                  }}
                >
                  {reviewing === selectedRecord.item._id ? (
                    <RefreshCw size={16} className="admin-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  {reviewing === selectedRecord.item._id ? 'Authorizing…' : 'Approve & Authorize'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
