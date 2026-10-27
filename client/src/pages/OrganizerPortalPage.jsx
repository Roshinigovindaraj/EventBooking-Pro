import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, CheckCircle2, CircleDollarSign, Download, Eye, Pause, Play, Plus, RefreshCw, ScanLine, Search, TicketCheck, Users } from 'lucide-react';
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

  return <div className="organizer-console">
    <header className="organizer-console-head"><div><small>ORGANIZER WORKSPACE</small><h1>Welcome, {user.name}</h1><p>Create, publish, operate and settle your events from one place.</p></div><Link to="/organize" className="org-create"><Plus/> Create event</Link></header>
    <nav className="organizer-tabs" aria-label="Organizer sections">{tabs.map(([id,name]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{name}</button>)}</nav>
    {notice && <p className="organizer-notice" role="status">{notice}</p>}
    {busy ? <p className="state-message">Loading organizer workspace…</p> : <>
      {tab === 'overview' && <><section className="organizer-stats">{stats.map(([Icon,name,value]) => <article key={name}><i><Icon/></i><span><small>{name}</small><b>{value}</b></span></article>)}</section><section className="organizer-panel"><header><div><h2>Event journey</h2><p>Every event follows the approval and publishing workflow.</p></div></header><div className="journey-row">{['Draft','Pending review','Published','Bookings & check-in','Settlement'].map((item,index) => <React.Fragment key={item}><span><b>{index + 1}</b>{item}</span>{index < 4 && <i>→</i>}</React.Fragment>)}</div></section><EventTable events={events} act={act}/></>}
      {tab === 'events' && <EventTable events={events} act={act} full/>}
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
  </div>;
}

function Status({ value }) { return <span className={`workflow-status status-${value}`}>{label(value)}</span>; }
function Empty({ text }) { return <p className="organizer-empty">{text}</p>; }
function EventTable({ events, act, full=false }) { const shown = full ? events : events.slice(0, 5); return <section className="organizer-panel"><header><div><h2>{full ? 'Manage events' : 'Recent events'}</h2><p>Update details, submit approvals, or pause a published event.</p></div>{!full && <b>{events.length} total</b>}</header><div className="organizer-table"><table><thead><tr><th>Event</th><th>Schedule</th><th>Inventory</th><th>Status</th><th>Actions</th></tr></thead><tbody>{shown.map(item => <tr key={item._id}><td><b>{item.title}</b><small>{item.category} · {item.location?.city}</small>{item.approvalFeedback && <em>{item.approvalFeedback}</em>}</td><td>{date(item.startsAt)}</td><td>{item.ticketTypes?.reduce((sum,ticket) => sum + ticket.sold, 0) || 0} / {item.ticketTypes?.reduce((sum,ticket) => sum + ticket.capacity, 0) || 0}</td><td><Status value={item.status}/></td><td><div className="row-actions">{['draft','rejected'].includes(item.status) && <button title="Submit for approval" onClick={() => act(`/organizer/events/${item._id}/submit`, { method:'POST' }, 'Event submitted for approval.')}><CheckCircle2/></button>}{item.status === 'published' && <><Link title="View customer page" to={`/discover?q=${encodeURIComponent(item.title)}`}><Eye/></Link><button title="Pause event" onClick={() => act(`/organizer/events/${item._id}/visibility`, { method:'PATCH', body:JSON.stringify({ paused:true }) }, 'Event paused.')}><Pause/></button></>}{item.status === 'suspended' && <button title="Resume event" onClick={() => act(`/organizer/events/${item._id}/visibility`, { method:'PATCH', body:JSON.stringify({ paused:false }) }, 'Event published again.')}><Play/></button>}</div></td></tr>)}</tbody></table>{!shown.length && <Empty text="No events yet. Create your first event to begin."/>}</div></section>; }
function BookingTable({ items }) { return <div className="organizer-table"><table><thead><tr><th>Reference</th><th>Customer</th><th>Event</th><th>Tickets</th><th>Amount</th><th>Payment</th></tr></thead><tbody>{items.map(item => <tr key={item._id}><td><b>{item.bookingReference}</b><small>{date(item.createdAt)}</small></td><td>{item.customer?.name}<small>{item.customer?.email}</small></td><td>{item.event?.title}</td><td>{item.quantity}</td><td>{money(item.totalMinor)}</td><td><Status value={item.paymentStatus}/></td></tr>)}</tbody></table>{!items.length && <Empty text="No matching bookings."/>}</div>; }
