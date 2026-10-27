import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient.js';

const money = (minor) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format((minor || 0) / 100);

const dateStr = (val) =>
  val
    ? new Date(val).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Not specified';

export default function VenueOwnerPortalPage({ user }) {
  const [tab, setTab] = React.useState('requests');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [venues, setVenues] = React.useState([]);
  const [reservations, setReservations] = React.useState([]);
  const [busy, setBusy] = React.useState(true);
  const [actionBusy, setActionBusy] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');

  // Decline with notes modal state
  const [declineModal, setDeclineModal] = React.useState({
    open: false,
    reservation: null,
    notes: '',
  });

  const load = React.useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [venueRes, reservationRes] = await Promise.all([
        apiRequest('/venue-owner/venues').catch(() => ({ items: [] })),
        apiRequest('/venue-owner/reservations').catch(() => ({ items: [] })),
      ]);
      setVenues(venueRes.items || []);
      setReservations(reservationRes.items || []);
    } catch (err) {
      setError(err.message || 'Unable to load venue owner records.');
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleConfirmReservation = async (reservation) => {
    setActionBusy(reservation._id);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/venue-owner/reservations/${reservation._id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Date and time availability confirmed by venue owner.',
        }),
      });
      setNotice(`Reservation #${reservation.reference} confirmed successfully! The slot is now booked.`);
      window.dispatchEvent(new Event('eventoria:data-changed'));
      await load();
    } catch (err) {
      setError(err.message || 'Could not confirm reservation.');
    } finally {
      setActionBusy('');
    }
  };

  const openDeclineModal = (reservation) => {
    setDeclineModal({
      open: true,
      reservation,
      notes: 'Sorry, the venue is unavailable for the requested date and time slot.',
    });
  };

  const handleDeclineSubmit = async (e) => {
    e.preventDefault();
    if (!declineModal.reservation) return;
    const { reservation, notes } = declineModal;
    setActionBusy(reservation._id);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/venue-owner/reservations/${reservation._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          notes: notes.trim() || 'Date and time unavailable. Request cancelled by owner.',
        }),
      });
      setNotice(`Reservation #${reservation.reference} declined and notes sent to user.`);
      setDeclineModal({ open: false, reservation: null, notes: '' });
      window.dispatchEvent(new Event('eventoria:data-changed'));
      await load();
    } catch (err) {
      setError(err.message || 'Could not decline reservation.');
    } finally {
      setActionBusy('');
    }
  };

  const handleSubmitVenueForReview = async (venueId) => {
    setActionBusy(venueId);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/venue-owner/venues/${venueId}/submit`, { method: 'POST' });
      setNotice('Venue submitted for platform administrator review.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not submit venue.');
    } finally {
      setActionBusy('');
    }
  };

  const pendingCount = reservations.filter((r) => r.status === 'pending_approval').length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const totalEarningsMinor = reservations
    .filter((r) => r.status === 'confirmed')
    .reduce((sum, r) => sum + (r.totalMinor || 0), 0);

  const filteredReservations = reservations.filter((r) => {
    if (filterStatus === 'pending' && r.status !== 'pending_approval') return false;
    if (filterStatus === 'confirmed' && r.status !== 'confirmed') return false;
    if (filterStatus === 'declined' && !['rejected', 'cancelled'].includes(r.status)) return false;
    if (query) {
      const q = query.toLowerCase();
      const match =
        r.reference?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q) ||
        r.venue?.name?.toLowerCase().includes(q) ||
        r.customer?.name?.toLowerCase().includes(q) ||
        r.customer?.email?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="organizer-console">
      <header className="organizer-console-head">
        <div>
          <small>VENUE MANAGEMENT CONSOLE</small>
          <h1>Welcome, {user.name}</h1>
          <p>Confirm availability for booking requests, manage your venues, and update clients.</p>
        </div>
        <Link to="/list-venue" className="org-create">
          <Plus size={16} /> List another venue
        </Link>
      </header>

      {/* KPI Stats */}
      <section className="organizer-stats">
        <article>
          <i><Building2 size={22} /></i>
          <span>
            <small>Total Venues</small>
            <b>{venues.length}</b>
          </span>
        </article>
        <article style={{ borderLeft: pendingCount > 0 ? '4px solid #f59e0b' : undefined }}>
          <i><CalendarClock size={22} color={pendingCount > 0 ? '#d97706' : undefined} /></i>
          <span>
            <small>Requests Pending Availability</small>
            <b style={{ color: pendingCount > 0 ? '#b45309' : undefined }}>{pendingCount}</b>
          </span>
        </article>
        <article>
          <i><CalendarCheck size={22} /></i>
          <span>
            <small>Confirmed Bookings</small>
            <b>{confirmedCount}</b>
          </span>
        </article>
        <article>
          <i><Sparkles size={22} /></i>
          <span>
            <small>Confirmed Booking Value</small>
            <b>{money(totalEarningsMinor)}</b>
          </span>
        </article>
      </section>

      {/* Notice / Alerts */}
      {notice && (
        <div style={{ margin: '14px 0', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}
      {error && (
        <div style={{ margin: '14px 0', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <nav className="organizer-tabs" aria-label="Venue owner sections">
        <button
          className={tab === 'requests' ? 'active' : ''}
          onClick={() => setTab('requests')}
        >
          Booking Requests {pendingCount > 0 && <span style={{ marginLeft: 6, background: '#f59e0b', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{pendingCount}</span>}
        </button>
        <button
          className={tab === 'venues' ? 'active' : ''}
          onClick={() => setTab('venues')}
        >
          My Listed Venues ({venues.length})
        </button>
      </nav>

      {busy ? (
        <p className="state-message">Loading venue requests & details…</p>
      ) : tab === 'requests' ? (
        <section className="organizer-panel">
          <header>
            <div>
              <h2>Booking Inquiries & Availability Confirmation</h2>
              <p>Check whether your venue is available on the requested date and time. Confirm to book, or decline with custom notes sent to the user.</p>
            </div>
            <div className="table-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                {[
                  ['all', 'All'],
                  ['pending', `Pending (${pendingCount})`],
                  ['confirmed', 'Confirmed'],
                  ['declined', 'Declined / Cancelled'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    style={{
                      background: filterStatus === val ? '#fff' : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: filterStatus === val ? '#0f172a' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: filterStatus === val ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                    onClick={() => setFilterStatus(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label>
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search user, venue or ref…"
                />
              </label>
              <button onClick={load} title="Refresh records" style={{ padding: '8px 12px' }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </header>

          {!filteredReservations.length ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <Building2 size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>No booking requests found</p>
              <small>When customers express interest or request bookings for your venues, they will appear here for confirmation.</small>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              {filteredReservations.map((r) => {
                const venueName = r.venue?.name || 'Venue';
                const venueCity = r.venue?.location?.city || '';
                const customerName = r.customer?.name || 'Customer';
                const customerEmail = r.customer?.email || '';
                const customerPhone = r.customer?.phone || '';
                const isPending = r.status === 'pending_approval';
                const isConfirmed = r.status === 'confirmed';
                const isRejectedOrCancelled = ['rejected', 'cancelled'].includes(r.status);

                return (
                  <article
                    key={r._id}
                    style={{
                      background: '#ffffff',
                      border: isPending ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '16px 20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>{venueName}</h3>
                          <span style={{ fontSize: 12, color: '#64748b' }}>• {venueCity}</span>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                            Ref: {r.reference}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#334155' }}>
                          <b>Occasion:</b> {r.purpose}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && (
                          <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={13} /> Needs Owner Review
                          </span>
                        )}
                        {isConfirmed && (
                          <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle2 size={13} /> Confirmed by Owner
                          </span>
                        )}
                        {isRejectedOrCancelled && (
                          <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <XCircle size={13} /> {r.status === 'rejected' ? 'Declined by Owner' : 'Cancelled'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Schedule & Client Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, background: '#f8fafc', padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Requested Schedule</span>
                        <b style={{ color: '#0f172a' }}>{dateStr(r.startsAt)}</b>
                        <span style={{ display: 'block', color: '#475569', fontSize: 12 }}>until {dateStr(r.endsAt)}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Client / Inquirer</span>
                        <b style={{ color: '#0f172a' }}>{customerName}</b>
                        <span style={{ display: 'block', color: '#475569', fontSize: 12 }}>{customerEmail} {customerPhone ? `· ${customerPhone}` : ''}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Estimated Total</span>
                        <b style={{ color: '#d97706', fontSize: 15 }}>{money(r.totalMinor)}</b>
                        <span style={{ display: 'block', color: '#64748b', fontSize: 12 }}>Rate: ₹{((r.venue?.priceMinorPerHour || 0) / 100).toLocaleString('en-IN')}/hr</span>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {r.customerNotes && (
                      <div style={{ fontSize: 12, color: '#334155', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                        <span style={{ fontWeight: 600, color: '#1e40af' }}>Customer Note: </span>
                        {r.customerNotes}
                      </div>
                    )}

                    {/* Owner Notes (if already confirmed or rejected) */}
                    {r.ownerNotes && (
                      <div style={{ fontSize: 12, color: isRejectedOrCancelled ? '#991b1b' : '#065f46', background: isRejectedOrCancelled ? '#fff5f5' : '#f0fdf4', border: `1px solid ${isRejectedOrCancelled ? '#fed7d7' : '#bbf7d0'}`, borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                        <span style={{ fontWeight: 700 }}>Notes to Customer: </span>
                        {r.ownerNotes}
                      </div>
                    )}

                    {/* Owner Interactive Controls */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => openDeclineModal(r)}
                            disabled={actionBusy === r._id}
                            style={{
                              background: '#fff',
                              border: '1px solid #ef4444',
                              color: '#dc2626',
                              padding: '8px 14px',
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <X size={15} /> Decline & Send Notes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmReservation(r)}
                            disabled={actionBusy === r._id}
                            style={{
                              background: '#16a34a',
                              border: 'none',
                              color: '#ffffff',
                              padding: '8px 16px',
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Check size={15} /> Confirm Availability
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                            ✓ Slot is reserved on venue calendar
                          </span>
                          <button
                            type="button"
                            onClick={() => openDeclineModal(r)}
                            disabled={actionBusy === r._id}
                            style={{
                              background: 'transparent',
                              border: '1px solid #cbd5e1',
                              color: '#64748b',
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel with Notes
                          </button>
                        </div>
                      )}

                      {isRejectedOrCancelled && (
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          Resolved · Client notified with notes
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* My Listed Venues Tab */
        <section className="organizer-panel">
          <header>
            <div>
              <h2>My Listed Venues</h2>
              <p>Venues you have submitted to Eventoria. Only published venues are visible to clients for reservation.</p>
            </div>
            <Link to="/list-venue" className="org-create" style={{ textDecoration: 'none' }}>
              <Plus size={16} /> New Venue Listing
            </Link>
          </header>

          {!venues.length ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <Building2 size={36} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>No venues listed yet</p>
              <Link to="/list-venue" style={{ display: 'inline-block', marginTop: 10, color: '#d97706', fontWeight: 600 }}>
                List your first venue now →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 14 }}>
              {venues.map((v) => (
                <article
                  key={v._id}
                  style={{
                    background: '#fff',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <img
                    src={v.images?.[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=80'}
                    alt={v.name}
                    style={{ width: '100%', height: 160, objectFit: 'cover' }}
                  />
                  <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>{v.name}</h4>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 99,
                          textTransform: 'capitalize',
                          background: v.status === 'published' ? '#ecfdf5' : v.status === 'pending_review' ? '#fffbeb' : '#f1f5f9',
                          color: v.status === 'published' ? '#065f46' : v.status === 'pending_review' ? '#b45309' : '#475569',
                        }}
                      >
                        {v.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} /> {v.location?.city || v.city || 'Tamil Nadu'} · Up to {v.capacity || 0} guests
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                      ₹{((v.priceMinorPerHour || 0) / 100).toLocaleString('en-IN')}
                      <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>/hr</span>
                    </div>

                    {['draft', 'rejected'].includes(v.status) && (
                      <button
                        type="button"
                        onClick={() => handleSubmitVenueForReview(v._id)}
                        disabled={actionBusy === v._id}
                        style={{
                          marginTop: 'auto',
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {actionBusy === v._id ? 'Submitting…' : 'Submit for Admin Review'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Decline with Notes Modal */}
      {declineModal.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionBusy) {
              setDeclineModal({ open: false, reservation: null, notes: '' });
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              maxWidth: 480,
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Decline Request & Send Notes</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setDeclineModal({ open: false, reservation: null, notes: '' })}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
              Let <b>{declineModal.reservation?.customer?.name || 'the customer'}</b> know why the venue is unavailable for this date & time, or suggest alternate slots:
            </p>

            <form onSubmit={handleDeclineSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Notes / Reason for Cancellation <em style={{ color: '#ef4444' }}>*</em>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. The hall is already reserved for a private reception on this date. We are available on Sunday afternoon or the following weekend."
                  value={declineModal.notes}
                  onChange={(e) => setDeclineModal((prev) => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setDeclineModal({ open: false, reservation: null, notes: '' })}
                  disabled={Boolean(actionBusy)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionBusy)}
                  style={{
                    background: '#dc2626',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Send size={14} /> {actionBusy ? 'Declining…' : 'Send Notes & Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
