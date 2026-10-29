import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, CheckCircle2, CircleDollarSign, Download, Eye, Pause, Play, Plus, RefreshCw, ScanLine, Search, TicketCheck, Users, Edit2, X, Save, AlertCircle, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/apiClient.js';

const money = minor => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((minor || 0) / 100);
const label = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const date = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set';

export default function OrganizerPortalPage({ user }) {
  const [tab, setTab] = React.useState('overview');
  const [events, setEvents] = React.useState([]);
  const [bookings, setBookings] = React.useState([]);
  const [report, setReport] = React.useState({});
  const [attendees, setAttendees] = React.useState([]);
  const [eventId, setEventId] = React.useState('');
  const [staff, setStaff] = React.useState([]);
  const [staffId, setStaffId] = React.useState('');
  const [assignedStaff, setAssignedStaff] = React.useState([]);
  const [query, setQuery] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [busy, setBusy] = React.useState(true);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const [eventResult, bookingResult, reportResult, staffResult] = await Promise.all([apiRequest('/organizer/events'), apiRequest('/organizer/bookings'), apiRequest('/organizer/reports'), apiRequest('/organizer/event-staff')]);
      setEvents(eventResult.items || []); setBookings(bookingResult.items || []); setReport(reportResult.report || {});
      setStaff(staffResult.items || []); setStaffId(current => current || staffResult.items?.[0]?._id || '');
      setEventId(current => current || eventResult.items?.[0]?._id || ''); setNotice('');
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    if (!eventId) { setAttendees([]); setAssignedStaff([]); return; }
    apiRequest(`/organizer/events/${eventId}/attendees`).then(result => setAttendees(result.items || [])).catch(error => setNotice(error.message));
    apiRequest(`/organizer/events/${eventId}/staff`).then(result => setAssignedStaff(result.items || [])).catch(() => setAssignedStaff([]));
  }, [eventId]);

  const act = async (path, options, success) => {
    try {
      await apiRequest(path, options);
      setNotice(success);
      await load();
      if (eventId) {
        apiRequest(`/organizer/events/${eventId}/staff`).then(result => setAssignedStaff(result.items || [])).catch(() => {});
      }
    } catch (error) { setNotice(error.message); }
  };
  const downloadCsv = () => {
    const rows = [['Booking reference','Event','Customer','Email','Quantity','Amount','Payment','Refund'], ...bookings.map(item => [item.bookingReference,item.event?.title,item.customer?.name,item.customer?.email,item.quantity,(item.totalMinor || 0) / 100,item.paymentStatus,item.refundStatus])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'eventoria-organizer-bookings.csv'; link.click(); URL.revokeObjectURL(link.href);
  };
  const filtered = bookings.filter(item => `${item.bookingReference} ${item.event?.title} ${item.customer?.name} ${item.customer?.email}`.toLowerCase().includes(query.toLowerCase()));
  const tabs = [['overview','Overview'],['events','My Events'],['bookings','Bookings'],['attendees','Attendees'],['staff','Event Staff & Check-in'],['refunds','Refunds'],['reports','Reports & Settlement']];
  const stats = [[CalendarDays,'Events',report.events || 0],[TicketCheck,'Tickets booked',report.bookings || 0],[Users,'Checked in',report.checkedIn || 0],[CircleDollarSign,'Net payable',money(report.netMinor)]];

  const [editingEvent, setEditingEvent] = React.useState(null);
  const [editForm, setEditForm] = React.useState({});
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState('');

  const startEdit = (ev) => {
    const s = ev.startsAt ? new Date(ev.startsAt).toISOString().slice(0, 16) : '';
    const e = ev.endsAt ? new Date(ev.endsAt).toISOString().slice(0, 16) : '';
    const primaryTicket = ev.ticketTypes?.[0] || {};
    setEditForm({
      title: ev.title || '',
      category: ev.category || 'Business',
      subcategory: ev.subcategory || 'Networking',
      startsAt: s,
      endsAt: e,
      venueName: ev.venueName || '',
      city: ev.location?.city || '',
      address: ev.location?.address || '',
      description: ev.description || '',
      ticketName: primaryTicket.name || 'General Admission',
      price: primaryTicket.priceMinor ? String(primaryTicket.priceMinor / 100) : '499',
      capacity: primaryTicket.capacity ? String(primaryTicket.capacity) : '100',
    });
    setEditError('');
    setEditingEvent(ev);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title?.trim()) return setEditError('Event title is required.');
    if (!editForm.startsAt || !editForm.endsAt) return setEditError('Start and end dates are required.');
    if (new Date(editForm.endsAt) <= new Date(editForm.startsAt)) return setEditError('Event end date must be after start date.');
    if (!editForm.venueName?.trim()) return setEditError('Venue name is required.');
    if (!editForm.city?.trim()) return setEditError('City is required.');
    if ((editForm.description?.trim().length || 0) < 20) return setEditError('Description must be at least 20 characters.');

    setEditSaving(true);
    setEditError('');
    try {
      const payload = {
        title: editForm.title.trim(),
        category: editForm.category,
        subcategory: editForm.subcategory,
        venueName: editForm.venueName.trim(),
        city: editForm.city.trim(),
        address: editForm.address?.trim() || '',
        startsAt: new Date(editForm.startsAt).toISOString(),
        endsAt: new Date(editForm.endsAt).toISOString(),
        description: editForm.description.trim(),
      };
      if (editForm.price && editForm.capacity) {
        payload.ticketTypes = [{
          name: editForm.ticketName || 'General Admission',
          priceMinor: Math.round(Number(editForm.price) * 100),
          currency: 'INR',
          capacity: Number(editForm.capacity),
          minPerOrder: 1,
          maxPerOrder: 10,
        }];
      }
      await apiRequest(`/organizer/events/${editingEvent._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setNotice(`Event "${editForm.title}" updated successfully! Changes are live on Eventoria.`);
      setEditingEvent(null);
      window.dispatchEvent(new Event('eventoria:data-changed'));
      await load();
    } catch (err) {
      setEditError(err.message || 'Could not update event.');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`Are you sure you want to permanently delete event "${event.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await apiRequest(`/organizer/events/${event._id}`, { method: 'DELETE' });
      setNotice(`Event "${event.title}" deleted successfully.`);
      window.dispatchEvent(new Event('eventoria:data-changed'));
      await load();
    } catch (err) {
      setNotice(err.message || 'Failed to delete event.');
    }
  };

  return <div className="organizer-console">
    <header className="organizer-console-head"><div><small>ORGANIZER WORKSPACE</small><h1>Welcome, {user.name}</h1><p>Create, publish, operate and settle your events from one place.</p></div><Link to="/organize" className="org-create"><Plus/> Create event</Link></header>
    <nav className="organizer-tabs" aria-label="Organizer sections">{tabs.map(([id,name]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{name}</button>)}</nav>
    {notice && <p className="organizer-notice" role="status">{notice}</p>}
    {busy ? <p className="state-message">Loading organizer workspace…</p> : <>
      {tab === 'overview' && <><section className="organizer-stats">{stats.map(([Icon,name,value]) => <article key={name}><i><Icon/></i><span><small>{name}</small><b>{value}</b></span></article>)}</section><section className="organizer-panel"><header><div><h2>Event journey</h2><p>Every event follows the approval and publishing workflow.</p></div></header><div className="journey-row">{['Draft','Pending review','Published','Bookings & check-in','Settlement'].map((item,index) => <React.Fragment key={item}><span><b>{index + 1}</b>{item}</span>{index < 4 && <i>→</i>}</React.Fragment>)}</div></section><EventTable events={events} act={act} onEdit={startEdit} onDelete={deleteEvent}/></>}
      {tab === 'events' && <EventTable events={events} act={act} full onEdit={startEdit} onDelete={deleteEvent}/>}
      {tab === 'bookings' && <section className="organizer-panel"><header><div><h2>Bookings</h2><p>Search customers and monitor payment status in real time.</p></div><div className="table-actions"><label><Search/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search bookings"/></label><button onClick={downloadCsv}><Download/> Export CSV</button></div></header><BookingTable items={filtered}/></section>}
      {tab === 'attendees' && <section className="staff-assignment"><b>Assign event staff</b><select value={staffId} onChange={e => setStaffId(e.target.value)}><option value="">Select staff member</option>{staff.map(item => <option value={item._id} key={item._id}>{item.name} · {item.email}</option>)}</select><button disabled={!eventId || !staffId} onClick={() => act('/organizer/events/' + eventId + '/staff', { method:'POST', body:JSON.stringify({ staffId }) }, 'Event staff assigned with check-in access.')}>Assign to selected event</button></section>}
      {tab === 'attendees' && <section className="organizer-panel"><header><div><h2>Attendee management</h2><p>Confirmed ticket holders and live check-in status.</p></div><div className="attendee-tools"><select value={eventId} onChange={e => setEventId(e.target.value)}>{events.map(item => <option value={item._id} key={item._id}>{item.title}</option>)}</select>{eventId && <Link to={'/scanner?eventId=' + eventId}><ScanLine/> Open Check-in Scanner</Link>}</div></header><div className="organizer-table"><table><thead><tr><th>Attendee</th><th>Ticket</th><th>Booking</th><th>Status</th><th>Checked in</th></tr></thead><tbody>{attendees.map(item => <tr key={item._id}><td><b>{item.owner?.name}</b><small>{item.owner?.email}</small></td><td>{item.code}</td><td>{item.booking?.bookingReference}</td><td><Status value={item.status}/></td><td>{item.checkedInAt ? date(item.checkedInAt) : '—'}</td></tr>)}</tbody></table>{!attendees.length && <Empty text="No issued tickets for this event yet."/>}</div></section>}
      {tab === 'staff' && (
        <section className="organizer-panel">
          <header>
            <div>
              <h2>Event Staff & Gate Access</h2>
              <p>Assign qualified staff to manage entry, scan attendee QR codes, and monitor attendance.</p>
            </div>
            <div className="attendee-tools">
              <select value={eventId} onChange={e => setEventId(e.target.value)}>
                {events.map(item => <option value={item._id} key={item._id}>{item.title}</option>)}
              </select>
              {eventId && <Link to={'/scanner?eventId=' + eventId}><ScanLine/> Open Gate Scanner</Link>}
            </div>
          </header>

          <div style={{ margin: '16px 0', padding: '16px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                SELECT ACTIVE EVENT STAFF
              </label>
              <select value={staffId} onChange={e => setStaffId(e.target.value)} style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}>
                <option value="">Select an event staff member</option>
                {staff.map(item => <option value={item._id} key={item._id}>{item.name} ({item.email})</option>)}
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                disabled={!eventId || !staffId}
                onClick={() => act(`/organizer/events/${eventId}/staff`, { method: 'POST', body: JSON.stringify({ staffId }) }, 'Event staff assigned with ticket scanner permissions.')}
                style={{ height: '38px', padding: '0 20px', background: '#2563eb', color: '#fff', border: 0, borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Assign Staff to Event
              </button>
            </div>
          </div>

          <div className="organizer-table">
            <h3 style={{ margin: '18px 0 8px', fontSize: '14px', color: '#1e293b' }}>Active Staff Assigned to Selected Event</h3>
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Assigned Permissions</th>
                  <th>Assigned Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignedStaff.map(assignment => (
                  <tr key={assignment._id}>
                    <td>
                      <b>{assignment.staff?.name || 'Staff Member'}</b>
                      <small>{assignment.staff?.email}</small>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', color: '#475569' }}>
                        {assignment.permissions?.map(p => p.replaceAll('_', ' ')).join(', ') || 'Ticket check-in, attendance view'}
                      </span>
                    </td>
                    <td>{date(assignment.createdAt)}</td>
                    <td><span className="workflow-status status-published">Active</span></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => act(`/organizer/events/${eventId}/staff/${assignment.staff?._id || assignment.staff}`, { method: 'DELETE' }, 'Staff assignment revoked.')}
                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!assignedStaff.length && <Empty text="No staff members assigned to this event yet. Select an event staff member above to assign them." />}
          </div>
        </section>
      )}
      {tab === 'refunds' && <section className="organizer-panel"><header><div><h2>Cancellations & refunds</h2><p>Review customer requests according to your event policy.</p></div></header><div className="refund-list">{bookings.filter(item => item.refundStatus !== 'none').map(item => <article key={item._id}><div><b>{item.bookingReference} · {item.customer?.name}</b><p>{item.refundReason || item.refundFeedback || 'Refund processed'}</p><small>{item.event?.title} · {money(item.totalMinor)}</small></div><Status value={item.refundStatus}/>{item.refundStatus === 'requested' && <div><button onClick={() => act(`/organizer/bookings/${item._id}/refund`, { method:'POST', body:JSON.stringify({ decision:'approved' }) }, 'Refund approved and processed.')}>Approve</button><button className="danger" onClick={() => act(`/organizer/bookings/${item._id}/refund`, { method:'POST', body:JSON.stringify({ decision:'rejected' }) }, 'Refund rejected.')}>Reject</button></div>}</article>)}{!bookings.some(item => item.refundStatus !== 'none') && <Empty text="No cancellation or refund requests."/>}</div></section>}
      {tab === 'reports' && <><section className="organizer-stats">{stats.map(([Icon,name,value]) => <article key={name}><i><Icon/></i><span><small>{name}</small><b>{value}</b></span></article>)}</section><section className="organizer-panel settlement"><h2>Revenue & settlement</h2><p><span>Gross sales</span><b>{money(report.grossMinor)}</b></p><p><span>Platform commission (10%)</span><b>- {money(report.commissionMinor)}</b></p><p><span>Refunds</span><b>- {money(report.refundedMinor)}</b></p><p className="net"><span>Net payable</span><b>{money(report.netMinor)}</b></p><button onClick={downloadCsv}><Download/> Download settlement report</button></section></>}
    </>}

    {/* Edit Event Modal */}
    {editingEvent && (
      <div
        className="guest-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${editingEvent.title}`}
        onClick={(e) => { if (e.target === e.currentTarget && !editSaving) setEditingEvent(null); }}
      >
        <article style={{ maxWidth: 640, width: 'min(640px, 96%)', maxHeight: '90vh', overflowY: 'auto' }}>
          <button
            className="guest-modal-close"
            onClick={() => setEditingEvent(null)}
            aria-label="Close edit modal"
            disabled={editSaving}
          >
            ×
          </button>
          <div style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#0f172a' }}>Edit Event Details</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              Update schedule, venue location, ticket prices or description. Changes will immediately sync to the homepage.
            </p>

            {editError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Starts At *
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.startsAt || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, startsAt: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Ends At *
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.endsAt || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, endsAt: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '13px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.venueName || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, venueName: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Select / Fix Ticket Type:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {[
                    { label: '⭐ General Admission', name: 'General Admission', price: '200' },
                    { label: '👑 VIP Pass', name: 'VIP Pass', price: '600' },
                    { label: '💎 VVIP Access', name: 'VVIP Access', price: '1200' },
                  ].map(tier => {
                    const active = (editForm.ticketName || '').toLowerCase().includes(tier.name.toLowerCase().split(' ')[0]);
                    return (
                      <button
                        key={tier.name}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, ticketName: tier.name, price: f.price || tier.price }))}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: active ? '2px solid #e11d48' : '1px solid #cbd5e1',
                          background: active ? '#fff1f2' : '#fff',
                          color: active ? '#e11d48' : '#334155',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Ticket Name
                  </label>
                  <input
                    type="text"
                    value={editForm.ticketName || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, ticketName: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Ticket Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.price || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, price: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Total Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.capacity || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, capacity: e.target.value }))}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Description * (min 20 chars)
                </label>
                <textarea
                  rows="4"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '8px 10px', fontSize: '13px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  disabled={editSaving}
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 0, borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} /> {editSaving ? 'Saving Changes…' : 'Save & Update Live'}
                </button>
              </div>
            </form>
          </div>
        </article>
      </div>
    )}
  </div>;
}

function Status({ value }) { return <span className={`workflow-status status-${value}`}>{label(value)}</span>; }
function Empty({ text }) { return <p className="organizer-empty">{text}</p>; }
function EventTable({ events, act, onEdit, onDelete, full=false }) {
  const shown = full ? events : events.slice(0, 5);
  return (
    <section className="organizer-panel">
      <header>
        <div>
          <h2>{full ? 'Manage events' : 'Recent events'}</h2>
          <p>Update details, submit approvals, or pause a published event.</p>
        </div>
        {!full && <b>{events.length} total</b>}
      </header>
      <div className="organizer-table">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Schedule</th>
              <th>Inventory</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(item => (
              <tr key={item._id}>
                <td>
                  <b>{item.title}</b>
                  <small>{item.category} · {item.location?.city}</small>
                  {item.approvalFeedback && <em>{item.approvalFeedback}</em>}
                </td>
                <td>{date(item.startsAt)}</td>
                <td>{item.ticketTypes?.reduce((sum,ticket) => sum + ticket.sold, 0) || 0} / {item.ticketTypes?.reduce((sum,ticket) => sum + ticket.capacity, 0) || 0}</td>
                <td><Status value={item.status}/></td>
                <td>
                  <div className="row-actions">
                    {onEdit && (
                      <button
                        title="Edit event details"
                        onClick={() => onEdit(item)}
                        style={{ color: '#2563eb' }}
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                    {['draft','rejected'].includes(item.status) && (
                      <button title="Submit for approval" onClick={() => act(`/organizer/events/${item._id}/submit`, { method:'POST' }, 'Event submitted for approval.')}>
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    {item.status === 'published' && (
                      <>
                        <Link title="View customer page" to={`/discover?q=${encodeURIComponent(item.title)}`}>
                          <Eye size={15} />
                        </Link>
                        <button title="Pause event" onClick={() => act(`/organizer/events/${item._id}/visibility`, { method:'PATCH', body:JSON.stringify({ paused:true }) }, 'Event paused.')}>
                          <Pause size={15} />
                        </button>
                      </>
                    )}
                    {item.status === 'suspended' && (
                      <button title="Resume event" onClick={() => act(`/organizer/events/${item._id}/visibility`, { method:'PATCH', body:JSON.stringify({ paused:false }) }, 'Event published again.')}>
                        <Play size={15} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        title="Delete event permanently"
                        onClick={() => onDelete(item)}
                        style={{ color: '#dc2626' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <Empty text="No events yet. Create your first event to begin."/>}
      </div>
    </section>
  );
}
function BookingTable({ items }) { return <div className="organizer-table"><table><thead><tr><th>Reference</th><th>Customer</th><th>Event</th><th>Tickets</th><th>Amount</th><th>Payment</th></tr></thead><tbody>{items.map(item => <tr key={item._id}><td><b>{item.bookingReference}</b><small>{date(item.createdAt)}</small></td><td>{item.customer?.name}<small>{item.customer?.email}</small></td><td>{item.event?.title}</td><td>{item.quantity}</td><td>{money(item.totalMinor)}</td><td><Status value={item.paymentStatus}/></td></tr>)}</tbody></table>{!items.length && <Empty text="No matching bookings."/>}</div>; }
