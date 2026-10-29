import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
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
  Trash2,
  Users,
  X,
  XCircle,
  AlertTriangle,
  Edit2,
  Save,
} from 'lucide-react';
import { apiRequest } from '../services/apiClient.js';
import { fireConfettiCelebration } from '../components/CelebrationPoppers.jsx';

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
  const [taskFilterStatus, setTaskFilterStatus] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [venues, setVenues] = React.useState([]);
  const [reservations, setReservations] = React.useState([]);
  const [tasks, setTasks] = React.useState([]);
  const [staffList, setStaffList] = React.useState([]);
  const [taskForm, setTaskForm] = React.useState({
    venueId: '',
    reservationId: '',
    assigneeId: '',
    title: '',
    notes: '',
  });
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

  // Edit venue modal state
  const [editingVenue, setEditingVenue] = React.useState(null);
  const [venueEditForm, setVenueEditForm] = React.useState({});
  const [venueSaving, setVenueSaving] = React.useState(false);
  const [venueEditError, setVenueEditError] = React.useState('');

  const handleStartEditVenue = (v) => {
    setVenueEditForm({
      name: v.name || '',
      type: v.type || 'Banquet Halls',
      city: v.location?.city || v.city || '',
      address: v.location?.address || v.address || '',
      capacity: v.capacity ? String(v.capacity) : '200',
      price: v.priceMinorPerHour ? String(Math.round(v.priceMinorPerHour / 100)) : '10000',
      amenities: Array.isArray(v.amenities) ? v.amenities.join(', ') : (v.amenities || ''),
      description: v.description || '',
    });
    setVenueEditError('');
    setEditingVenue(v);
  };

  const handleSaveVenueEdit = async (e) => {
    e.preventDefault();
    if (!venueEditForm.name?.trim()) return setVenueEditError('Venue name is required.');
    if (!venueEditForm.city?.trim()) return setVenueEditError('City is required.');
    if (!venueEditForm.capacity || Number(venueEditForm.capacity) <= 0) return setVenueEditError('Enter a valid guest capacity.');
    if (!venueEditForm.price || Number(venueEditForm.price) < 0) return setVenueEditError('Enter a valid price per hour.');
    if ((venueEditForm.description?.trim().length || 0) < 5) return setVenueEditError('Description must be at least 5 characters.');

    setVenueSaving(true);
    setVenueEditError('');
    try {
      const payload = {
        name: venueEditForm.name.trim(),
        type: venueEditForm.type,
        city: venueEditForm.city.trim(),
        address: venueEditForm.address?.trim() || '',
        capacity: Number(venueEditForm.capacity),
        priceMinorPerHour: Math.round(Number(venueEditForm.price) * 100),
        amenities: venueEditForm.amenities ? venueEditForm.amenities.split(',').map(s => s.trim()).filter(Boolean) : [],
        description: venueEditForm.description.trim(),
      };
      await apiRequest(`/venue-owner/venues/${editingVenue._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setNotice(`Venue "${venueEditForm.name}" updated successfully! Changes are live on the homepage.`);
      setEditingVenue(null);
      window.dispatchEvent(new Event('eventoria:data-changed'));
      await load();
    } catch (err) {
      setVenueEditError(err.message || 'Could not update venue.');
    } finally {
      setVenueSaving(false);
    }
  };

  const load = React.useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const [venueRes, reservationRes, taskRes, staffRes] = await Promise.all([
        apiRequest('/venue-owner/venues').catch(() => ({ items: [] })),
        apiRequest('/venue-owner/reservations').catch(() => ({ items: [] })),
        apiRequest('/venue-owner/tasks').catch(() => ({ items: [] })),
        apiRequest('/venue-owner/staff').catch(() => ({ items: [] })),
      ]);
      setVenues(venueRes.items || []);
      setReservations(reservationRes.items || []);
      setTasks(taskRes.items || []);
      setStaffList(staffRes.items || []);
    } catch (err) {
      setError(err.message || 'Unable to load venue owner records.');
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const taskPresets = [
    { title: 'Hall Cleaning & Seating Arrangement', notes: 'Arrange banquet chairs, table linen, and clear central aisle.' },
    { title: 'A/V & Stage Lighting Verification', notes: 'Test wireless microphones, stage spotlights, and generator power backup.' },
    { title: 'Catering & Service Access Verification', notes: 'Open service entry, inspect kitchen water supply and waste disposal.' },
    { title: 'Air Conditioning & Power Generator Check', notes: 'Pre-cool main hall to 22°C and check diesel generator fuel levels.' },
    { title: 'Gate Entry & Guest Parking Protocol', notes: 'Coordinate valet parking and display directional signs at main gate.' },
    { title: 'Post-event Inspection & Handover', notes: 'Check for physical damage, verify vendor checkout, and lock facility.' },
  ];

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.venueId || !taskForm.assigneeId || !taskForm.title.trim()) {
      setError('Please select a venue, staff member, and provide a task title.');
      return;
    }
    setActionBusy('create-task');
    setError('');
    setNotice('');
    try {
      await apiRequest('/venue-owner/tasks', {
        method: 'POST',
        body: JSON.stringify({
          venueId: taskForm.venueId,
          reservationId: taskForm.reservationId || undefined,
          assigneeId: taskForm.assigneeId,
          title: taskForm.title.trim(),
          notes: taskForm.notes?.trim() || '',
        }),
      });
      setNotice('Work task assigned to venue staff successfully!');
      setTaskForm((prev) => ({
        ...prev,
        title: '',
        notes: '',
        reservationId: '',
      }));
      await load();
      window.dispatchEvent(new Event('eventoria:data-changed'));
    } catch (err) {
      setError(err.message || 'Could not assign task.');
    } finally {
      setActionBusy('');
    }
  };

  const handleDeleteTask = async (taskId) => {
    setActionBusy(taskId);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/venue-owner/tasks/${taskId}`, { method: 'DELETE' });
      setNotice('Task removed.');
      await load();
      window.dispatchEvent(new Event('eventoria:data-changed'));
    } catch (err) {
      setError(err.message || 'Could not delete task.');
    } finally {
      setActionBusy('');
    }
  };

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
      fireConfettiCelebration();
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

  const handleDeleteVenue = async (venue) => {
    if (!window.confirm(`Are you sure you want to permanently delete venue "${venue.name}"? This action cannot be undone.`)) {
      return;
    }
    setActionBusy(venue._id);
    setError('');
    setNotice('');
    try {
      await apiRequest(`/venue-owner/venues/${venue._id}`, { method: 'DELETE' });
      setNotice(`Venue "${venue.name}" was successfully deleted.`);
      window.dispatchEvent(new Event('eventoria:data-changed'));
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete venue.');
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
        <button
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
        >
          Venue Staff &amp; Tasks ({tasks.length})
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
      ) : tab === 'venues' ? (
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

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleStartEditVenue(v)}
                        style={{
                          flex: 1,
                          minWidth: '100px',
                          background: '#f8fafc',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          padding: '7px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                        }}
                      >
                        <Edit2 size={13} /> Edit Details
                      </button>
                      {['draft', 'rejected'].includes(v.status) && (
                        <button
                          type="button"
                          onClick={() => handleSubmitVenueForReview(v._id)}
                          disabled={actionBusy === v._id}
                          style={{
                            flex: 1,
                            minWidth: '130px',
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
                          {actionBusy === v._id ? 'Submitting…' : 'Submit Review'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteVenue(v)}
                        disabled={actionBusy === v._id}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '7px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                        }}
                        title="Permanently delete venue"
                      >
                        <Trash2 size={13} /> {actionBusy === v._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="organizer-panel">
          <header>
            <div>
              <h2>Venue Staff Operations &amp; Task Assignments</h2>
              <p>Assign pre-event preparation, facility readiness, and logistics work to registered venue staff members.</p>
            </div>
          </header>

          {/* Form to Assign Work */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: 14,
              padding: '22px 24px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>Assign Work to Venue Staff</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Select venue, staff member, and give actionable instructions.</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                ⚡ Quick Task Presets (Click to Auto-fill):
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {taskPresets.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => setTaskForm((prev) => ({ ...prev, title: preset.title, notes: preset.notes }))}
                    style={{
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 20,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    + {preset.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                {/* Select Venue */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Target Venue <em>*</em>
                  </label>
                  <select
                    required
                    value={taskForm.venueId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, venueId: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                  >
                    <option value="">Select a Venue</option>
                    {venues.map((v) => (
                      <option key={v._id} value={v._id}>{v.name} ({v.location?.city || v.city})</option>
                    ))}
                  </select>
                </div>

                {/* Select Staff Member */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Assign To (Venue Staff) <em>*</em>
                  </label>
                  <select
                    required
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, assigneeId: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                  >
                    <option value="">Select Staff Member</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} · {s.email}</option>
                    ))}
                  </select>
                </div>

                {/* Link to Booking (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Linked Reservation (Optional)
                  </label>
                  <select
                    value={taskForm.reservationId}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, reservationId: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                  >
                    <option value="">None / General Venue Prep</option>
                    {reservations.filter((r) => r.status === 'confirmed').map((r) => (
                      <option key={r._id} value={r._id}>#{r.reference} - {r.purpose}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task Title */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Task Title / Action Item <em>*</em>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stage lighting check, Hall A seating arrangement"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              {/* Notes / Special Instructions */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Instructions / Detailed Checklist
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide detailed instructions (e.g. Test all 4 cordless mics, verify generator diesel level)..."
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={actionBusy === 'create-task' || venues.length === 0 || staffList.length === 0}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Send size={15} /> {actionBusy === 'create-task' ? 'Assigning Task…' : 'Assign Work to Venue Staff'}
                </button>
              </div>
            </form>
          </div>

          {/* Assigned Tasks Table / Cards */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a', fontWeight: 700 }}>
              Assigned Operational Work ({tasks.length})
            </h3>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {[
                ['all', 'All'],
                ['todo', 'To Do'],
                ['in_progress', 'In Progress'],
                ['completed', 'Completed'],
                ['blocked', 'Blocked'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTaskFilterStatus(key)}
                  style={{
                    border: 'none',
                    background: taskFilterStatus === key ? '#ffffff' : 'transparent',
                    color: taskFilterStatus === key ? '#0f172a' : '#64748b',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: taskFilterStatus === key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12, padding: '36px 20px', textAlign: 'center' }}>
              <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
                No tasks assigned yet. Use the form above to assign operational tasks to your venue staff, or confirm booking requests to auto-assign readiness checklists!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks
                .filter((t) => taskFilterStatus === 'all' || t.status === taskFilterStatus)
                .map((t) => {
                  const statusStyles = {
                    completed: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', label: 'Completed' },
                    in_progress: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'In Progress' },
                    blocked: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: 'Blocked' },
                    todo: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'To Do' },
                  }[t.status] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: t.status };

                  return (
                    <div
                      key={t._id}
                      style={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span
                              style={{
                                background: statusStyles.bg,
                                color: statusStyles.color,
                                border: `1px solid ${statusStyles.border}`,
                                padding: '2px 8px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {statusStyles.label}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                              📍 {t.venue?.name || 'Venue'}
                            </span>
                          </div>
                          <h4 style={{ margin: '2px 0 4px', fontSize: 15, color: '#0f172a' }}>{t.title}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t._id)}
                          disabled={actionBusy === t._id}
                          title="Remove task"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
                        <span>
                          <strong>Assigned Staff:</strong> {t.assignee?.name || 'Staff'} ({t.assignee?.email || 'N/A'})
                        </span>
                        {t.reservation && (
                          <span>
                            <strong>Reservation:</strong> #{t.reservation.reference} ({t.reservation.purpose})
                          </span>
                        )}
                        {t.completedAt && (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            ✓ Finished on {new Date(t.completedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>

                      {t.notes && (
                        <div style={{ fontSize: 12, background: '#f8fafc', padding: '8px 12px', borderRadius: 6, color: '#334155', border: '1px solid #f1f5f9' }}>
                          <strong>Instructions / Field Remarks:</strong> {t.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* Edit Venue Modal */}
      {editingVenue && (
        <div
          className="guest-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${editingVenue.name}`}
          onClick={(e) => { if (e.target === e.currentTarget && !venueSaving) setEditingVenue(null); }}
        >
          <article style={{ maxWidth: 640, width: 'min(640px, 96%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <button
              className="guest-modal-close"
              onClick={() => setEditingVenue(null)}
              aria-label="Close edit venue modal"
              disabled={venueSaving}
            >
              ×
            </button>
            <div style={{ padding: '24px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#0f172a' }}>Edit Venue Details</h2>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                Update venue name, hourly pricing, capacity, address, amenities or description. Changes will immediately reflect on the home page and venues catalog.
              </p>

              {venueEditError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} /> {venueEditError}
                </div>
              )}

              <form onSubmit={handleSaveVenueEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      value={venueEditForm.name || ''}
                      onChange={(e) => setVenueEditForm(f => ({ ...f, name: e.target.value }))}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Venue Type *
                    </label>
                    <select
                      value={venueEditForm.type || 'Banquet Halls'}
                      onChange={(e) => setVenueEditForm(f => ({ ...f, type: e.target.value }))}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                    >
                      {['Banquet Halls', 'Convention Centers', 'Resorts', 'Outdoor Spaces', 'Hotels', 'Lawns', 'Unique Venues'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Price per Hour (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={venueEditForm.price || ''}
                      onChange={(e) => setVenueEditForm(f => ({ ...f, price: e.target.value }))}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Guest Capacity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={venueEditForm.capacity || ''}
                      onChange={(e) => setVenueEditForm(f => ({ ...f, capacity: e.target.value }))}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      value={venueEditForm.city || ''}
                      onChange={(e) => setVenueEditForm(f => ({ ...f, city: e.target.value }))}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Address
                    </label>
                    <input
                      type="text"
                      value={venueEditForm.address || ''}
                      onChange={(e) => setVenueEditForm(f => ({ ...f, address: e.target.value }))}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Amenities (comma-separated, e.g. Parking, Wi-Fi, Air Conditioning)
                  </label>
                  <input
                    type="text"
                    value={venueEditForm.amenities || ''}
                    onChange={(e) => setVenueEditForm(f => ({ ...f, amenities: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Description * (min 5 chars)
                  </label>
                  <textarea
                    rows={4}
                    value={venueEditForm.description || ''}
                    onChange={(e) => setVenueEditForm(f => ({ ...f, description: e.target.value }))}
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '13px', resize: 'vertical' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingVenue(null)}
                    disabled={venueSaving}
                    style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={venueSaving}
                    style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 0, borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Save size={16} /> {venueSaving ? 'Saving Changes…' : 'Save & Update Live'}
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
