import React from 'react';
import { Navigate, Link, useParams } from 'react-router-dom';
import { Activity, BarChart3, Building2, CalendarDays, CheckCircle2, ClipboardList, Crown, QrCode, RefreshCw, ShieldCheck, Ticket, Users, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest } from '../services/apiClient.js';
import { Topbar } from './public/CatalogPage.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import OrganizerPortalPage from './OrganizerPortalPage.jsx';
import AdminPortalPage from './AdminPortalPage.jsx';
import VenueOwnerPortalPage from './VenueOwnerPortalPage.jsx';
import VenueStaffPortalPage from './VenueStaffPortalPage.jsx';

const portals = {
  organizer: { role: 'event_organizer', title: 'Event Organizer', icon: CalendarDays, endpoints: [['Events', '/organizer/events'], ['Bookings & Attendees', '/organizer/bookings']], modules: ['Create & manage events', 'Tickets, pricing & offers', 'Bookings & attendees', 'Check-in & attendance', 'Reports & analytics'] },
  'venue-owner': { role: 'venue_owner', title: 'Venue Owner', icon: Building2, endpoints: [['Venues', '/venue-owner/venues'], ['Booking Requests', '/venue-owner/reservations']], modules: ['Venue details', 'Availability & pricing', 'Booking requests', 'Venue operations', 'Reports & earnings'] },
  'event-staff': { role: 'event_staff', title: 'Event Staff', icon: QrCode, endpoints: [['Assigned Events', '/event-staff/assignments']], modules: ['Assigned events', 'Event preparation', 'QR check-in', 'Live attendance', 'Event completion'] },
  'venue-staff': { role: 'venue_staff', title: 'Venue Staff', icon: ClipboardList, endpoints: [['Assigned Tasks', '/venue-staff/tasks']], modules: ['Assigned venues', 'Pre-event preparation', 'Guest check-in', 'Real-time updates', 'Event completion'] },
  admin: { role: 'admin', title: 'Administrator', icon: ShieldCheck, endpoints: [['Users', '/admin/users'], ['Applications', '/admin/applications'], ['Events', '/organizer/events'], ['Venues', '/venue-owner/venues'], ['Audit Logs', '/admin/audit-logs']], modules: ['User management', 'Event & venue approvals', 'Bookings & payments', 'Reports & analytics', 'System administration'] },
  'super-admin': { role: 'super_admin', title: 'Super Administrator', icon: Crown, endpoints: [['Users & Roles', '/admin/users'], ['Applications', '/admin/applications'], ['Events', '/organizer/events'], ['Venues', '/venue-owner/venues'], ['Security Logs', '/admin/audit-logs']], modules: ['Platform overview', 'Users & role management', 'Events & venues', 'Bookings & payments', 'Reports & analytics', 'System administration'] },
};

const itemTitle = (item) => item.title || item.name || item.bookingReference || item.action || item.applicant?.name || item.venue?.name || item.event?.title || 'Record';
const itemMeta = (item) => {
  if (item.event) {
    const when = item.event.startsAt ? new Date(item.event.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    return [when, item.event.venueName, item.event.location?.city, item.permissions?.map((value) => value.replaceAll('_', ' ')).join(', ')].filter(Boolean).join(' · ');
  }
  if (item.venue) return [item.venue.name, item.status, item.notes].filter(Boolean).join(' · ');
  return item.status || item.email || item.type || item.scopeType || item.createdAt || '';
};

export default function RolePortalPage() {
  const { portal } = useParams();
  const config = portals[portal];
  const { user, loading } = useAuth();
  const [sections, setSections] = React.useState([]);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [reviewing, setReviewing] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const reviewItem = async (section, item, decision) => {
    const resource = section.label === 'Events' ? 'events' : section.label === 'Venues' ? 'venues' : section.label === 'Applications' ? 'applications' : null;
    if (!resource) return;
    try {
      setReviewing(item._id); setError(''); setNotice('');
      await apiRequest(`/admin/${resource}/${item._id}/review`, { method: 'POST', body: JSON.stringify({ decision }) });
      setNotice(`${itemTitle(item)} was ${decision}.`);
      window.dispatchEvent(new Event('eventoria:data-changed'));
      setRefreshKey((value) => value + 1);
    } catch (requestError) { setError(requestError.message); }
    finally { setReviewing(''); }
  };

  React.useEffect(() => {
    if (!user || !config || !user.roles.includes(config.role)) return;
    let active = true;
    const load = () => Promise.all(config.endpoints.map(async ([label, path]) => {
      try { const result = await apiRequest(path); return { label, items: result.items || [] }; }
      catch (requestError) { return { label, items: [], error: requestError.message }; }
    })).then((result) => {
      if (!active) return;
      setSections(result);
      const failures = result.filter((section) => section.error).map((section) => `${section.label}: ${section.error}`);
      setError(failures.join(' · '));
      setBusy(false);
    });
    setBusy(true); load();
    const refresh = () => load();
    window.addEventListener('focus', refresh);
    window.addEventListener('eventoria:data-changed', refresh);
    const timer = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('eventoria:data-changed', refresh); };
  }, [user, config, refreshKey]);

  if (loading) return <p className="state-message">Restoring your session…</p>;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: `/portal/${portal}` }}/>;
  if (!config || !user.roles.includes(config.role)) return <Navigate to="/dashboard" replace/>;
  const Icon = config.icon;
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const sectionItems = label => sections.find(item => item.label === label)?.items || [];
  const pendingApprovals = sections.flatMap(current => current.items.filter(item => ['pending', 'pending_review'].includes(item.status)).map(item => ({ section: current, item })));
  const moduleCount = module => {
    if (/User management|Users & role/i.test(module)) return sectionItems(portal === 'super-admin' ? 'Users & Roles' : 'Users').length;
    if (/approval|Events & venues/i.test(module)) return pendingApprovals.length;
    if (/System administration/i.test(module)) return sectionItems(portal === 'super-admin' ? 'Security Logs' : 'Audit Logs').length;
    if (/Platform overview/i.test(module)) return total;
    return 0;
  };

  if (portal === 'organizer') return <main className="role-portal"><Topbar active="account"/><section className="role-wrap"><OrganizerPortalPage user={user}/></section><SiteFooter/></main>;
  if (portal === 'venue-owner') return <main className="role-portal"><Topbar active="account"/><section className="role-wrap"><VenueOwnerPortalPage user={user}/></section><SiteFooter/></main>;
  if (portal === 'venue-staff') return <main className="role-portal"><Topbar active="account"/><section className="role-wrap"><VenueStaffPortalPage user={user}/></section><SiteFooter/></main>;
  if (['admin', 'super-admin'].includes(portal)) return <main className="role-portal"><Topbar active="account"/><section className="role-wrap"><header className="role-hero"><span><Icon/></span><div><p>ROLE WORKSPACE</p><h1>{config.title} Dashboard</h1><small>Review and manage platform activity.</small></div><Link to="/dashboard">Account Dashboard</Link></header><AdminPortalPage/></section><SiteFooter/></main>;

  return <main className="role-portal"><Topbar active="account"/><section className="role-wrap">
    <header className="role-hero"><span><Icon/></span><div><p>ROLE WORKSPACE</p><h1>{config.title} Dashboard</h1><small>Access is restricted to users with the {config.title} role.</small></div><Link to="/dashboard">Account Dashboard</Link></header>
    {portal === 'event-staff' && <div className="staff-primary-action"><div><b>Gate check-in</b><span>Scan, verify attendee details, then approve or deny entry.</span></div><Link to="/scanner"><QrCode/> Open Ticket Scanner</Link></div>}
    <section className="role-module-grid">{config.modules.map((module, index) => <article key={module}><i>{React.createElement([Users, CalendarDays, Ticket, Activity, BarChart3, ShieldCheck][index % 6])}</i><b>{module}</b><small>{index < sections.length ? `${sections[index].items.length} current records` : 'HLD module access'}</small></article>)}</section>
    {error && <p className="role-error" role="alert">{error}</p>}
    {['admin', 'super-admin'].includes(portal) && <section className="role-approvals">{sections.flatMap((section) => section.items.filter((item) => ['pending', 'pending_review'].includes(item.status)).map((item) => ({ section, item }))).map(({ section, item }) => <article key={`review-${item._id}`}><span><strong>{itemTitle(item)}</strong><small>{section.label} · {String(item.status).replaceAll('_', ' ')}</small></span>{['Events', 'Venues', 'Applications'].includes(section.label) && <span className="role-review"><button onClick={() => reviewItem(section, item, 'approved')}>Approve</button><button onClick={() => reviewItem(section, item, 'rejected')}>Reject</button></span>}</article>)}</section>}
    {busy ? <p className="state-message">Loading role modules…</p> : <section className="role-data-grid">{sections.map((section) => <article key={section.label}><header><h2>{section.label}</h2><b>{section.items.length}</b></header>{section.items.length ? <div>{section.items.slice(0, 12).map((item) => <p key={item._id || item.id}><span><strong>{itemTitle(item)}</strong><small>{String(itemMeta(item)).replaceAll('_', ' ')}</small></span><CheckCircle2/></p>)}</div> : <div><small>No records assigned yet.</small>{portal === 'event-staff' && <div style={{ marginTop: '12px', padding: '12px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}><b>💡 How events are assigned:</b><p style={{ margin: '4px 0 0', lineHeight: 1.5, color: '#2563eb' }}>Event Organizers assign staff to their events from the <strong>Organizer Workspace &gt; Event Staff &amp; Check-in</strong> tab. Once an organizer assigns your account (<code>{user.name}</code>), your event and ticket scanner will activate here automatically.</p></div>}</div>}</article>)}</section>}
  </section><SiteFooter/></main>;
}

export { portals };
