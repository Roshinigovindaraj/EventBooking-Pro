import React from "react";
import { CalendarDays, Heart, Mail, MapPin, ShieldCheck, Trash2, UserRound, Users } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Topbar, eventData } from "./public/CatalogPage.jsx";
import { venueData } from "./public/VenuesPage.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

const roleNames = { customer: "Customer", event_organizer: "Event Organizer", venue_owner: "Venue Owner", event_staff: "Event Staff", venue_staff: "Venue Staff", admin: "Administrator", super_admin: "Super Administrator" };

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [wishlist, setWishlist] = React.useState([]);
  const [wishlistOnly, setWishlistOnly] = React.useState(false);
  const loadWishlist = React.useCallback(() => {
    const savedEvents = eventData.filter((event) => localStorage.getItem(`eventoria:wishlist:event:${event.id}`) === "1").map((event) => ({ ...event, kind: "event", key: `event:${event.id}` }));
    const savedVenues = venueData.filter((venue) => localStorage.getItem(`eventoria:wishlist:venue:${venue.name}`) === "1").map((venue) => ({ ...venue, kind: "venue", key: `venue:${venue.name}` }));
    setWishlist([...savedEvents, ...savedVenues]);
  }, []);
  React.useEffect(loadWishlist, [loadWishlist]);
  const removeFavorite = (item) => {
    localStorage.removeItem(`eventoria:wishlist:${item.key}`);
    loadWishlist();
  };
  if (loading) return <p className="state-message">Restoring your session…</p>;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: "/dashboard" }}/>;
  return <main className="dashboard-page"><Topbar active="account"/><section className="dashboard-wrap">
    <header className="dashboard-welcome"><div><p className="eyebrow">MY EVENTORIA</p><h1>Welcome, {user.name}</h1><p>Manage your account, bookings and saved experiences in one place.</p></div><span className="dashboard-avatar">{user.name?.charAt(0).toUpperCase() || "U"}</span></header>
    <div className={`dashboard-layout ${wishlistOnly ? "dashboard-hidden" : ""}`}><aside className="profile-card"><div className="profile-title"><UserRound/><div><h2>Account details</h2><span>Personal information</span></div></div><dl><div><dt>Full name</dt><dd>{user.name}</dd></div><div><dt>Email address</dt><dd><Mail/> {user.email}</dd></div><div><dt>Account role</dt><dd>{user.roles.map((role) => roleNames[role] || role).join(", ")}</dd></div><div><dt>Status</dt><dd className="profile-status"><ShieldCheck/> {user.status || "active"}</dd></div></dl></aside>
      <section className="dashboard-content"><div className="dashboard-summary"><article><i><CalendarDays/></i><span><b>0</b><small>Upcoming bookings</small></span></article><article><i><Heart/></i><span><b>{wishlist.length}</b><small>Saved favorites</small></span></article></div><div className="dashboard-grid"><article><h2>My Bookings</h2><p>Your upcoming event tickets and venue reservations will appear here.</p><a href="/discover">Explore Events</a></article><article><h2>My Wishlist</h2><p>You currently have {wishlist.length} saved {wishlist.length === 1 ? "item" : "items"} in this browser.</p><button type="button" onClick={() => setWishlistOnly(true)}>View Saved Items</button></article>{user.roles.includes("event_organizer")&&<article><h2>Organizer Tools</h2><p>Create drafts and submit your events for review.</p><a href="/organize">Create Event</a></article>}{user.roles.includes("venue_owner")&&<article><h2>Venue Owner</h2><p>Manage venue listings, availability and reservations.</p><a href="/list-venue">Manage Venues</a></article>}</div></section>
    </div>
    <section className={`dashboard-wishlist ${wishlistOnly ? "wishlist-focus" : ""}`} id="wishlist"><header><div><p className="eyebrow">SAVED FOR LATER</p><h2>My Wishlist</h2><p>Your saved events and venues are available directly here.</p></div><div className="wishlist-head-actions"><span>{wishlist.length} {wishlist.length === 1 ? "item" : "items"}</span>{wishlistOnly&&<button type="button" onClick={() => setWishlistOnly(false)}>Back to Dashboard</button>}</div></header>{wishlist.length ? <div className="dashboard-wishlist-grid">{wishlist.map((item) => <article key={item.key}><div className="dashboard-wishlist-image"><img src={item.image} alt={item.kind === "event" ? item.title : item.name}/><span>{item.kind === "event" ? "Event" : "Venue"}</span><button onClick={() => removeFavorite(item)} aria-label={`Remove ${item.kind === "event" ? item.title : item.name} from wishlist`}><Trash2/></button></div><div><h3>{item.kind === "event" ? item.title : item.name}</h3>{item.kind === "event" ? <><p><CalendarDays/> {item.day} {item.month} · {item.time}</p><p><MapPin/> {item.venue}, {item.city}</p><strong>{item.price}</strong><a href="/discover">View Event</a></> : <><p><MapPin/> {item.city}, Tamil Nadu</p><p><Users/> {item.guests} guests</p><strong>₹ {item.price.toLocaleString("en-IN")}/day</strong><a href="/venues">View Venue</a></>}</div></article>)}</div> : <div className="dashboard-wishlist-empty"><Heart/><h3>Your wishlist is empty</h3><p>Save events or venues using the heart icon and they will appear here.</p><a href="/discover">Explore Events</a><a href="/venues">Browse Venues</a></div>}</section>
  </section><SiteFooter/></main>;
}
