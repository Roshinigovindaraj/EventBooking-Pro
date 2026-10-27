import React from "react";
import { CalendarDays, Heart, Mail, MapPin, ShieldCheck, Ticket, Trash2, UserRound, Users } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Topbar } from "./public/CatalogPage.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { canDownloadEventTickets, downloadEventTickets } from "../utils/ticketPdf.js";
import { apiRequest } from "../services/apiClient.js";

const roleNames = { customer: "Customer", event_organizer: "Event Organizer", venue_owner: "Venue Owner", event_staff: "Event Staff", venue_staff: "Venue Staff", admin: "Administrator", super_admin: "Super Administrator" };
const rolePortals = { event_organizer: 'organizer', venue_owner: 'venue-owner', event_staff: 'event-staff', venue_staff: 'venue-staff', admin: 'admin', super_admin: 'super-admin' };
const displayStatus = (status) => String(status || "").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const normalizeBackendBooking = (booking, customerName) => {
  const event = booking.event || {};
  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  const ticketType = event.ticketTypes?.find((type) => String(type._id) === String(booking.ticketTypeId));
  return {
    id: booking.bookingReference || booking._id,
    backendId: booking._id,
    eventId: event._id,
    customerName,
    title: event.title || "Event booking",
    image: event.images?.[0] || "/images/hero-wedding.png",
    date: startsAt && !Number.isNaN(startsAt.valueOf()) ? startsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date unavailable",
    time: startsAt && !Number.isNaN(startsAt.valueOf()) ? startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "Time unavailable",
    venue: event.venueName || event.location?.address || "Venue to be announced",
    city: event.location?.city || "",
    price: new Intl.NumberFormat("en-IN", { style: "currency", currency: booking.currency || "INR" }).format((booking.totalMinor || 0) / 100),
    quantity: booking.quantity,
    ticketType: ticketType?.name || "General Admission",
    status: displayStatus(booking.status),
    bookedAt: booking.createdAt,
  };
};

const normalizeVenueReservation = (res, customerName) => {
  const venue = res.venue || {};
  const startsAt = res.startsAt ? new Date(res.startsAt) : null;
  const endsAt = res.endsAt ? new Date(res.endsAt) : null;
  return {
    id: res.reference || res._id,
    backendId: res._id,
    venueId: venue._id,
    customerName,
    title: venue.name || "Venue Reservation",
    image: venue.images?.[0] || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=80",
    date: startsAt && !Number.isNaN(startsAt.valueOf()) ? startsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date unavailable",
    time: startsAt && !Number.isNaN(startsAt.valueOf()) ? `${startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} - ${endsAt && !Number.isNaN(endsAt.valueOf()) ? endsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ''}` : "Time unavailable",
    venue: venue.name || "Venue",
    city: venue.location?.city || venue.city || "",
    price: new Intl.NumberFormat("en-IN", { style: "currency", currency: res.currency || "INR" }).format((res.totalMinor || 0) / 100),
    quantity: 1,
    ticketType: res.purpose || "Venue Booking",
    rawStatus: res.status,
    status: res.status === 'pending_approval' ? 'Pending Owner Review' : res.status === 'confirmed' ? 'Confirmed by Venue Owner' : res.status === 'rejected' ? 'Declined by Venue Owner' : displayStatus(res.status),
    ownerNotes: res.ownerNotes || '',
    customerNotes: res.customerNotes || '',
    bookedAt: res.createdAt,
    isVenueReservation: true,
  };
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const handleInternalNavigation = (event) => {
    const link = event.target.closest('a[href^="/"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.getAttribute('href'));
  };
  React.useEffect(() => {
    document.addEventListener('click', handleInternalNavigation);
    return () => document.removeEventListener('click', handleInternalNavigation);
  });
  const [wishlist, setWishlist] = React.useState([]);
  const [bookings, setBookings] = React.useState([]);
  const [bookingError, setBookingError] = React.useState("");
  const [wishlistOnly, setWishlistOnly] = React.useState(false);
  const loadWishlist = React.useCallback(() => {
    if (!user) return setWishlist([]);
    const owner = encodeURIComponent(user._id || user.id || user.email.toLowerCase());
    const prefix = `eventoria:wishlist:${owner}:`;
    const items = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const subKey = key.slice(prefix.length);
      const val = localStorage.getItem(key);
      if (!val || val === "0") continue;
      try {
        const parsed = JSON.parse(val);
        if (parsed && (parsed.title || parsed.name)) {
          items.push({
            ...parsed,
            kind: subKey.startsWith("venue") ? "venue" : "event",
            key: subKey,
          });
        }
      } catch {
        // legacy flag without full payload
      }
    }
    setWishlist(items);
  }, [user]);
  React.useEffect(loadWishlist, [loadWishlist]);
  React.useEffect(() => {
    if (!user) return setBookings([]);
    const owner = encodeURIComponent(user._id || user.id || user.email.toLowerCase());
    const storageKey = `eventoria:bookings:${owner}`;
    let localBookings = [];
    try { localBookings = JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { localBookings = []; }
    setBookings(localBookings);
    let active = true;
    const loadAndMigrateBookings = async () => {
      const migratedLocalBookings = [...localBookings];
      for (let index = 0; index < migratedLocalBookings.length; index += 1) {
        const localBooking = migratedLocalBookings[index];
        if (localBooking.backendId || !['confirmed', 'cancelled', 'rescheduled'].includes(String(localBooking.status).toLowerCase())) continue;
        try {
          const catalog = await apiRequest(`/events?q=${encodeURIComponent(localBooking.title)}&limit=50`);
          const event = catalog.items?.find((item) => item.title.toLowerCase() === localBooking.title.toLowerCase());
          const ticketType = event?.ticketTypes?.find((type) => type.name === localBooking.ticketType) || event?.ticketTypes?.[0];
          if (!event || !ticketType) continue;
          const { booking: created } = await apiRequest('/bookings', { method: 'POST', body: JSON.stringify({ eventId: event._id, ticketTypeId: ticketType._id, quantity: Number(localBooking.quantity) || 1 }) });
          migratedLocalBookings[index] = { ...localBooking, id: created.bookingReference, backendId: created._id, eventId: event._id };
          localStorage.setItem(storageKey, JSON.stringify(migratedLocalBookings));
          const confirmation = await apiRequest('/payments/mock-confirm', { method: 'POST', body: JSON.stringify({ bookingId: created._id }) });
          migratedLocalBookings[index] = { ...migratedLocalBookings[index], tickets: confirmation.tickets || [] };
          localStorage.setItem(storageKey, JSON.stringify(migratedLocalBookings));
          if (String(localBooking.status).toLowerCase() === 'cancelled') await apiRequest(`/bookings/${created._id}/cancel`, { method: 'PATCH' });
        } catch {
          // Leave unsupported/failed legacy records in local storage; they remain visible and can be retried safely by the user.
        }
      }
      const [{ items: eventItems = [] }, { items: venueItems = [] }] = await Promise.all([
        apiRequest('/bookings/me').catch(() => ({ items: [] })),
        apiRequest('/venue-reservations/me').catch(() => ({ items: [] })),
      ]);
      return { eventItems, venueItems, migratedLocalBookings };
    };
    loadAndMigrateBookings()
      .then(({ eventItems, venueItems, migratedLocalBookings }) => {
        if (!active) return;
        const localByReference = new Map(migratedLocalBookings.map((item) => [item.id, item]));
        const backendBookings = eventItems.map((item) => normalizeBackendBooking(item, user.name)).map((item) => ({ ...item, tickets: localByReference.get(item.id)?.tickets || [] }));
        const venueBookings = venueItems.map((item) => normalizeVenueReservation(item, user.name));
        const backendReferences = new Set([...backendBookings.map((item) => item.id), ...venueBookings.map((item) => item.id)]);
        setBookings([
          ...backendBookings,
          ...venueBookings,
          ...migratedLocalBookings.filter((item) => !backendReferences.has(item.id))
        ]);
        setBookingError("");
      })
      .catch((error) => { if (!active) return; setBookingError(error.message || "Unable to load backend bookings."); });
    return () => { active = false; };
  }, [user]);
  const saveBookings = (next) => {
    const owner = encodeURIComponent(user._id || user.id || user.email.toLowerCase());
    localStorage.setItem(`eventoria:bookings:${owner}`, JSON.stringify(next));
    setBookings(next);
  };
  const cancelBooking = async (booking) => {
    if (booking.backendId) {
      try {
        const endpoint = booking.isVenueReservation
          ? `/venue-reservations/${booking.backendId}/cancel`
          : `/bookings/${booking.backendId}/cancel`;
        await apiRequest(endpoint, { method: "PATCH" });
        setBookings((items) => items.map((item) => item.id === booking.id ? { ...item, status: "Cancelled", rawStatus: "cancelled" } : item));
        setBookingError("");
      } catch (error) { setBookingError(error.message || "Unable to cancel booking."); }
      return;
    }
    saveBookings(bookings.map((item) => item.id === booking.id ? { ...item, status: "Cancelled", rawStatus: "cancelled" } : item));
  };
  const rescheduleBooking = (id) => {
    const nextDate = window.prompt("Enter the new event date", bookings.find((item) => item.id === id)?.date || "");
    if (nextDate?.trim()) saveBookings(bookings.map((item) => item.id === id ? { ...item, date: nextDate.trim(), status: "Rescheduled" } : item));
  };
  const [downloadingId, setDownloadingId] = React.useState(null);
  const downloadBooking = async (booking) => {
    if (!canDownloadEventTickets(booking)) return;
    setDownloadingId(booking.id);
    try {
      await downloadEventTickets({ ...booking, customerName: booking.customerName || user.name });
    } catch (err) {
      alert(err.message || "Failed to download ticket PDF.");
    } finally {
      setDownloadingId(null);
    }
  };
  const removeFavorite = (item) => {
    const owner = encodeURIComponent(user._id || user.id || user.email.toLowerCase());
    localStorage.removeItem(`eventoria:wishlist:${owner}:${item.key}`);
    loadWishlist();
  };
  if (loading) return <p className="state-message">Restoring your session…</p>;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: "/dashboard" }}/>;
  return <main className="dashboard-page"><Topbar active="account"/><section className="dashboard-wrap">
    <header className="dashboard-welcome"><div><p className="eyebrow">MY EVENTORIA</p><h1>Welcome, {user.name}</h1><p>Manage your account, bookings and saved experiences in one place.</p></div><span className="dashboard-avatar">{user.name?.charAt(0).toUpperCase() || "U"}</span></header>
    <div className={`dashboard-layout ${wishlistOnly ? "dashboard-hidden" : ""}`}><aside className="profile-card"><div className="profile-title"><UserRound/><div><h2>Account details</h2><span>Personal information</span></div></div><dl><div><dt>Full name</dt><dd>{user.name}</dd></div><div><dt>Email address</dt><dd><Mail/> {user.email}</dd></div><div><dt>Account role</dt><dd>{user.roles.map((role) => roleNames[role] || role).join(", ")}</dd></div><div><dt>Status</dt><dd className="profile-status"><ShieldCheck/> {user.status || "active"}</dd></div></dl></aside>
      <section className="dashboard-content"><div className="dashboard-summary"><article><i><CalendarDays/></i><span><b>{bookings.filter((item) => !['Cancelled', 'cancelled', 'rejected', 'Declined by Venue Owner'].includes(item.rawStatus || item.status)).length}</b><small>Upcoming bookings</small></span></article><article><i><Heart/></i><span><b>{wishlist.length}</b><small>Saved favorites</small></span></article></div><div className="dashboard-grid"><article className="dashboard-bookings"><h2>My Bookings</h2>{bookingError&&<p className="booking-error" role="alert">{bookingError}</p>}{bookings.length ? <div className="dashboard-booking-list">{bookings.map((booking) => { const ticketAvailable = canDownloadEventTickets(booking); const isCancelledOrDeclined = ['Cancelled', 'cancelled', 'rejected', 'Declined by Venue Owner'].includes(booking.rawStatus || booking.status); return <div key={booking.id}><img src={booking.image} alt=""/><span><b>{booking.title}</b><small><CalendarDays/> {booking.date} · {booking.time}</small><small><MapPin/> {booking.venue}{booking.city ? `, ${booking.city}` : ""}</small><strong className={isCancelledOrDeclined ? "cancelled" : ""}><Ticket/> {booking.status} · {booking.id}</strong>{booking.ownerNotes && <div style={{ margin: '6px 0', padding: '8px 12px', background: ['rejected', 'Declined by Venue Owner'].includes(booking.rawStatus || booking.status) ? '#fef3f2' : '#f0fdf4', border: `1px solid ${['rejected', 'Declined by Venue Owner'].includes(booking.rawStatus || booking.status) ? '#fecdca' : '#bbf7d0'}`, borderRadius: 6, fontSize: 12, color: ['rejected', 'Declined by Venue Owner'].includes(booking.rawStatus || booking.status) ? '#b42318' : '#097948' }}><b>{['rejected', 'Declined by Venue Owner'].includes(booking.rawStatus || booking.status) ? 'Reason / Notes from Venue Owner: ' : 'Note from Venue Owner: '}</b>{booking.ownerNotes}</div>}<span className="booking-manage"><button disabled={!ticketAvailable || downloadingId === booking.id} title={ticketAvailable ? "Download ticket PDF" : "Ticket unavailable for this booking"} onClick={() => downloadBooking(booking)}>{downloadingId === booking.id ? "Preparing…" : "Ticket"}</button>{!booking.isVenueReservation && <button disabled={isCancelledOrDeclined || Boolean(booking.backendId)} title={booking.backendId ? "Backend booking rescheduling is not available yet" : undefined} onClick={() => rescheduleBooking(booking.id)}>Reschedule</button>}<button disabled={isCancelledOrDeclined} onClick={() => cancelBooking(booking)}>Cancel</button></span></span></div>; })}</div> : <><p>Your upcoming event tickets and venue reservations will appear here.</p><a href="/discover">Explore Events</a></>}</article><article><h2>My Wishlist</h2><p>You currently have {wishlist.length} saved {wishlist.length === 1 ? "item" : "items"} in this browser.</p><button type="button" onClick={() => setWishlistOnly(true)}>View Saved Items</button></article>{user.roles.filter((role) => rolePortals[role]).map((role) => <article key={role}><h2>{roleNames[role]} Workspace</h2><p>Open the role modules and live operational records defined by the platform HLD.</p><a href={`/portal/${rolePortals[role]}`}>Open Workspace</a></article>)}</div></section>
    </div>
    <section className={`dashboard-wishlist ${wishlistOnly ? "wishlist-focus" : ""}`} id="wishlist"><header><div><p className="eyebrow">SAVED FOR LATER</p><h2>My Wishlist</h2><p>Your saved events and venues are available directly here.</p></div><div className="wishlist-head-actions"><span>{wishlist.length} {wishlist.length === 1 ? "item" : "items"}</span>{wishlistOnly&&<button type="button" onClick={() => setWishlistOnly(false)}>Back to Dashboard</button>}</div></header>{wishlist.length ? <div className="dashboard-wishlist-grid">{wishlist.map((item) => <article key={item.key}><div className="dashboard-wishlist-image"><img src={item.image} alt={item.kind === "event" ? item.title : item.name}/><span>{item.kind === "event" ? "Event" : "Venue"}</span><button onClick={() => removeFavorite(item)} aria-label={`Remove ${item.kind === "event" ? item.title : item.name} from wishlist`}><Trash2/></button></div><div><h3>{item.kind === "event" ? item.title : item.name}</h3>{item.kind === "event" ? <><p><CalendarDays/> {item.day} {item.month} · {item.time}</p><p><MapPin/> {item.venue}, {item.city}</p><strong>{item.price}</strong><a href="/discover">View Event</a></> : <><p><MapPin/> {item.city}, Tamil Nadu</p><p><Users/> {item.guests} guests</p><strong>₹ {item.price.toLocaleString("en-IN")}/day</strong><a href="/venues">View Venue</a></>}</div></article>)}</div> : <div className="dashboard-wishlist-empty"><Heart/><h3>Your wishlist is empty</h3><p>Save events or venues using the heart icon and they will appear here.</p><a href="/discover">Explore Events</a><a href="/venues">Browse Venues</a></div>}</section>
  </section><SiteFooter/></main>;
}
