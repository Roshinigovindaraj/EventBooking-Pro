import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarDays, Heart, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Headphones, Tag, Sparkles, Mail, Menu, X, Star, Ticket, Building2, Smartphone, Music2, PartyPopper, Gem, BriefcaseBusiness, Trophy, TentTree, Mic2, Store, Play, Users, Gift, House, Share2, ExternalLink, Clock } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { isItemWishlisted, toggleWishlistItem } from './services/wishlistService.js';
import AuthPage from './pages/auth/AuthPage.jsx';
import CatalogPage, { Topbar, publicEvent } from './pages/public/CatalogPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import VenuesPage, { publicVenue } from './pages/public/VenuesPage.jsx';
import OrganizePage from './pages/public/OrganizePage.jsx';
import ListVenuePage from './pages/public/ListVenuePage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import RolePortalPage from './pages/RolePortalPage.jsx';
import TicketScannerPage from './pages/TicketScannerPage.jsx';
import { eventCategories } from './data/eventCategories.js';
import { apiRequest } from './services/apiClient.js';
import { fireConfettiCelebration, fireButtonPopper } from './components/CelebrationPoppers.jsx';
import './styles.css';

const img = {
  hero: '/images/hero-wedding.png',
  event1: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=700&q=80',
  event2: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=700&q=80',
  event3: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=700&q=80',
  event4: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=700&q=80',
  venue1: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=80',
  venue2: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=700&q=80',
  venue3: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=700&q=80',
  venue4: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=80',
  why: '/images/why-events.png',
  wedding: '/marriage.png',
};

const heroSlides = [
  '/images/hero-wedding.png',
  '/images/sportsevent.png',
  '/images/music.png',
];
const heroCopy = [
  { kicker: 'CELEBRATE LOVE', kickerAccent: 'BEAUTIFULLY', lines: [['Your Dream ', 'Wedding'], ['Starts Right ', 'Here']], description: 'Discover breathtaking venues and thoughtful details for a celebration that feels entirely yours.' },
  { kicker: 'CHEER • PLAY', kickerAccent: 'BELONG', lines: [['Experience Live ', 'Sports'], ['Feel Every ', 'Moment']], description: 'Discover thrilling matches, fan festivals and sporting experiences that bring everyone together.' },
  { kicker: 'FEEL THE BEAT', kickerAccent: 'LIVE', lines: [['Unforgettable ', 'Concerts'], ['Electrifying ', 'Music']], description: 'Find live performances, vibrant stages, and unforgettable musical nights with top artists.' },
];

const categories = eventCategories.map(({ name, image }) => [name, image]);

function Logo({ light = false }) { return <a className={`logo ${light ? 'light' : ''}`} href="#"><span className="logo-mark">✦</span><span><b>Eventoria</b><small>Events • Venues • Every Moment</small></span></a> }

function Header() {
  const [open, setOpen] = React.useState(false);
  const links = [['Home', House, '#home'], ['Events', CalendarDays, '/discover'], ['Venues', MapPin, '#venues'], ['Become an Organizer', Users, '/organize#become-organizer'], ['List Your Venue', Store, '/list-venue']];
  const handleNavClick = (e) => {
    const clickable = e.target.closest("button, a, [role='button']");
    if (clickable) {
      fireButtonPopper(e);
    }
  };
  return <header className="header wrap" onClickCapture={handleNavClick}><Logo /><nav className={open ? 'open' : ''}>{links.map(([n, I, to], i) => to.startsWith('/') ? <Link className={i === 0 ? 'active' : ''} to={to} onClick={() => setOpen(false)} key={n}><I aria-hidden="true" /><span>{n}</span></Link> : <a className={i === 0 ? 'active' : ''} href={to} onClick={() => setOpen(false)} key={n}><I aria-hidden="true" /><span>{n}</span></a>)}</nav><div className="header-actions"><Link className="btn ghost" to="/auth/login">Login</Link><Link className="btn primary" to="/auth/register">Sign Up <ArrowRight /></Link><button className="menu" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button></div></header>;
}

function Hero() {
  const [activeSlide, setActiveSlide] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide(current => (current + 1) % heroSlides.length), 5000);
    return () => window.clearInterval(timer);
  }, []);
  const copy = heroCopy[activeSlide] || heroCopy[0];
  return <section className={`hero hero-skin-${activeSlide}`} id="home"><Topbar home /><div className="hero-art" aria-hidden="true">{heroSlides.map((src, i) => <div className={`hero-slide ${i === activeSlide ? 'active' : ''}`} style={{ backgroundImage: `url(${src})` }} key={src} />)}</div><div className="hero-content wrap"><div className={`hero-copy hero-theme-${activeSlide}`} key={activeSlide}><p className="eyebrow">{copy.kicker} <span>{copy.kickerAccent}</span></p><h1>{copy.lines.map(([text, accent], i) => <React.Fragment key={`${text}-${accent}`}><span className="hero-copy-line">{text}{accent && <em className={`hero-keyword keyword-${i + 1}`}>{accent}</em>}</span>{i < copy.lines.length - 1 && <br />}</React.Fragment>)}</h1><p className="lead"><strong>{copy.description}</strong></p></div></div><div className="story"><button><Play fill="currentColor" /></button><span>Watch<br />Our Story</span></div><SearchPanel /></section>
}

function SearchPanel() { const [tab, setTab] = React.useState('Events'); const navigate = useNavigate(); const submit = e => { e.preventDefault(); const data = new FormData(e.currentTarget); const params = new URLSearchParams({ type: tab.toLowerCase() }); for (const [key, value] of data) if (value) params.set(key, value); navigate(`/discover?${params}`) }; return <div className="search-wrap wrap"><div className="tabs"><button className={tab === 'Events' ? 'active' : ''} onClick={() => setTab('Events')}>Events</button><button className={tab === 'Venues' ? 'active' : ''} onClick={() => setTab('Venues')}>Venues</button></div><form className="search-panel" onSubmit={submit}><label><Search /><input name="q" placeholder={tab === 'Events' ? 'Try “Music events in Salem”' : 'Search venues by name or type...'} /></label><label><MapPin /><input name="location" placeholder="Select Location" /></label><label><CalendarDays /><input name="date" type="date" aria-label="Select Date" /></label><button aria-label="Submit search"><Search /></button></form><div className="popular"><b>Popular Searches:</b>{['Music', 'Cricket', 'Workshops', 'Networking', 'Kids events', 'Food festivals', 'Cultural programs'].map(x => <button type="button" key={x} onClick={() => navigate(`/discover?type=${tab.toLowerCase()}&q=${encodeURIComponent(x)}`)}>{x}</button>)}</div></div> }

function Categories() {
  const handleCategoryClick = (e) => {
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / (window.innerWidth || 1000);
      const y = (rect.top + rect.height / 2) / (window.innerHeight || 800);
      fireConfettiCelebration({
        originLeft: { x: Math.max(0.05, x - 0.06), y: Math.max(0.05, Math.min(0.95, y)) },
        originRight: { x: Math.min(0.95, x + 0.06), y: Math.max(0.05, Math.min(0.95, y)) },
        particleCount: 50,
      });
    } catch {}
  };
  return (
    <section className="categories wrap" aria-label="Event categories">
      <div className="categories-track">
        {[...categories, ...categories].map(([name, image], i) => {
          const duplicate = i >= categories.length;
          return (
            <Link
              to={`/discover?type=events&category=${encodeURIComponent(name)}`}
              onClick={(e) => handleCategoryClick(e)}
              key={`${name}-${i}`}
              aria-hidden={duplicate || undefined}
              tabIndex={duplicate ? -1 : undefined}
            >
              <span className="category-sparkles" aria-hidden="true"><small>✦</small><small>✦</small></span>
              <i className={`cat c${i % categories.length}`}><img src={image} alt={duplicate ? '' : name} /></i>
              <b>{name}</b>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CategoryDirectory() {
  const navigate = useNavigate();
  const handleSubcategoryClick = (groupName, item) => {
    fireConfettiCelebration();
    navigate(`/discover?type=events&category=${encodeURIComponent(groupName)}&subcategory=${encodeURIComponent(item)}`);
  };
  return (
    <section className="category-directory wrap" aria-labelledby="category-directory-title">
      <div className="category-directory-heading">
        <p className="eyebrow">EXPLORE YOUR INTERESTS</p>
        <h2 id="category-directory-title">Browse Events by Category</h2>
        <p>Search by event name, category, location, organizer, or venue.</p>
      </div>
      <div className="category-groups">
        {eventCategories.map(group => (
          <article key={group.name}>
            <div className="category-group-title">
              <img src={group.image} alt="" />
              <h3>{group.name}</h3>
            </div>
            <div className="subcategory-list">
              {group.subcategories.map(item => (
                <button key={item} onClick={() => handleSubcategoryClick(group.name, item)}>{item}</button>
              ))}
            </div>
          </article>
        ))}
      </div>
      <button className="category-example" onClick={() => navigate('/discover?type=events&q=Music%20events%20in%20Salem')}><Search /> Try: “Music events in Salem” <ArrowRight /></button>
    </section>
  );
}

function SectionTitle({ kicker, title, accent, desc }) { return <div className="section-heading"><div><p className="eyebrow">{kicker}</p><h2>{title} <em>{accent}</em></h2>{desc && <p>{desc}</p>}</div><a href={kicker.includes('VENUE') ? '/venues' : '/discover'}>View All {kicker.includes('VENUE') ? 'Venues' : 'Events'} <ArrowRight /></a></div> }
function CarouselButtons({ onPrev, onNext, hasPrev = true, hasNext = true }) {
  return (
    <div className="carousel-buttons">
      <button onClick={onPrev} disabled={!hasPrev} style={!hasPrev ? { opacity: 0.4, cursor: 'not-allowed' } : {}} aria-label="Previous">
        <ChevronLeft />
      </button>
      <button onClick={onNext} disabled={!hasNext} style={!hasNext ? { opacity: 0.4, cursor: 'not-allowed' } : {}} aria-label="Next">
        <ChevronRight />
      </button>
    </div>
  );
}

function EventCard({ e, onSelect }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = React.useState(() => isItemWishlisted('event', e.id, user));
  React.useEffect(() => {
    setLiked(isItemWishlisted('event', e.id, user));
    const onWishlistChanged = (evt) => {
      if (evt.detail?.kind === 'event' && String(evt.detail?.id) === String(e.id)) {
        setLiked(evt.detail.liked);
      }
    };
    window.addEventListener('eventoria:wishlist-updated', onWishlistChanged);
    return () => window.removeEventListener('eventoria:wishlist-updated', onWishlistChanged);
  }, [e.id, user]);

  const toggleHeart = (evt) => {
    evt.stopPropagation();
    if (!user) {
      navigate('/auth/login', {
        state: {
          from: '/',
          notice: 'Please log in to save events to your wishlist.',
        },
      });
      return;
    }
    toggleWishlistItem('event', e, user).then((next) => setLiked(next));
  };

  const isSoldOut = Boolean(e.isSoldOut || (e.remainingTickets !== undefined && e.remainingTickets <= 0));
  const isCompleted = Boolean(e.isCompleted);
  const book = (evt) => {
    if (evt) evt.stopPropagation();
    if (isSoldOut || isCompleted) return;
    navigate(`/booking/${e.id}`, { state: { event: e } });
  };

  return (
    <article
      className="card"
      onClick={() => onSelect && onSelect(e)}
      style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      title={`Click to view details for ${e.title}`}
    >
      <div className="card-image">
        <img src={e.image} alt={e.title} />
        <button className={`heart ${liked ? 'liked' : ''}`} onClick={toggleHeart} aria-label={`Save ${e.title}`}>
          <Heart fill={liked ? "currentColor" : "none"} />
        </button>
        <div className="date">
          <b>{e.day}</b>
          <span>{e.month}</span>
        </div>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`pill ${e.type?.toLowerCase() || 'events'}`}>{e.type}</span>
          {isCompleted && <span className="pill" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>Concluded</span>}
          {isSoldOut && !isCompleted && <span className="pill" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>Sold Out</span>}
        </div>
        <h3 style={{ margin: '8px 0 4px', fontSize: '16px', lineHeight: 1.3 }}>{e.title}</h3>
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', margin: '4px 0' }}><MapPin size={14} /> {e.city || 'Tamil Nadu'}</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', margin: '4px 0' }}><Building2 size={14} /> {e.venue}</p>
        <div className="card-footer-row" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', lineHeight: 1.1 }}>Tickets from</span>
            <b style={{ fontSize: '15px', color: '#f0527b', fontWeight: 700 }}>{e.price}</b>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              className="card-details-btn"
              onClick={(evt) => { evt.stopPropagation(); onSelect && onSelect(e); }}
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1.5px solid #cbd5e1',
                fontSize: '12px',
                padding: '0 12px',
                height: '32px',
                borderRadius: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              Details
            </button>
            <button
              type="button"
              className="card-circle-btn"
              onClick={book}
              disabled={isSoldOut || isCompleted}
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                background: (isSoldOut || isCompleted) ? '#94a3b8' : '#f0527b',
                color: '#ffffff',
                border: 'none',
                display: 'grid',
                placeItems: 'center',
                cursor: (isSoldOut || isCompleted) ? 'not-allowed' : 'pointer',
                padding: 0,
                margin: 0,
                flexShrink: 0,
                transition: 'transform 0.18s ease'
              }}
              aria-label={isCompleted ? `${e.title} is concluded` : isSoldOut ? `${e.title} is sold out` : `Book ${e.title}`}
            >
              {isCompleted ? <span style={{ fontSize: '10px', fontWeight: 700 }}>End</span> : isSoldOut ? <span style={{ fontSize: '10px', fontWeight: 700 }}>Sold</span> : <ArrowRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function VenueCard({ v, onSelect }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const venueId = v.id || v.name;
  const [liked, setLiked] = React.useState(() => isItemWishlisted('venue', venueId, user));
  React.useEffect(() => {
    setLiked(isItemWishlisted('venue', venueId, user));
    const onWishlistChanged = (evt) => {
      if (evt.detail?.kind === 'venue' && String(evt.detail?.id) === String(venueId)) {
        setLiked(evt.detail.liked);
      }
    };
    window.addEventListener('eventoria:wishlist-updated', onWishlistChanged);
    return () => window.removeEventListener('eventoria:wishlist-updated', onWishlistChanged);
  }, [venueId, user]);

  const toggleHeart = (evt) => {
    evt.stopPropagation();
    if (!user) {
      navigate('/auth/login', {
        state: {
          from: '/',
          notice: 'Please log in to save venues to your wishlist.',
        },
      });
      return;
    }
    toggleWishlistItem('venue', v, user).then((next) => setLiked(next));
  };

  return (
    <article
      className="card"
      onClick={() => onSelect && onSelect(v)}
      style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      title={`Click to view details for ${v.name}`}
    >
      <div className="card-image venue">
        <img src={v.image} alt={v.name} />
        <button className={`heart ${liked ? 'liked' : ''}`} onClick={toggleHeart} aria-label={`Save ${v.name}`}>
          <Heart fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="card-body">
        <h3 style={{ margin: '8px 0 4px', fontSize: '16px', lineHeight: 1.3 }}>{v.name}</h3>
        <div className="rating" style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0' }}>
          <Star fill="#ff9e34" size={14} color="#ff9e34" /> {v.rating} <small>({v.reviews} reviews)</small>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', margin: '4px 0' }}><Building2 size={14} /> {v.type} <span>•</span> {v.city}</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', margin: '4px 0' }}><Users size={14} /> {v.guests} guests</p>
        <div className="card-footer-row" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', lineHeight: 1.1 }}>Hourly rate</span>
            <b style={{ fontSize: '15px', color: '#f0527b', fontWeight: 700 }}>₹{v.price.toLocaleString('en-IN')}<span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>/hr</span></b>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              className="card-details-btn"
              onClick={(evt) => { evt.stopPropagation(); onSelect && onSelect(v); }}
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1.5px solid #cbd5e1',
                fontSize: '12px',
                padding: '0 12px',
                height: '32px',
                borderRadius: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              Details
            </button>
            <button
              type="button"
              className="card-circle-btn"
              onClick={(evt) => {
                evt.stopPropagation();
                if (onSelect) onSelect(v);
                else navigate(`/venues?type=${encodeURIComponent(v.type || 'All Venues')}`);
              }}
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                background: '#f0527b',
                color: '#ffffff',
                border: 'none',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                padding: 0,
                margin: 0,
                flexShrink: 0,
                transition: 'transform 0.18s ease'
              }}
              aria-label={`View ${v.name}`}
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Listings() {
  const [events, setEvents] = React.useState([]);
  const [venues, setVenues] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [selectedVenue, setSelectedVenue] = React.useState(null);
  const [eventPage, setEventPage] = React.useState(0);
  const [venuePage, setVenuePage] = React.useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadData = React.useCallback(() => {
    let active = true;
    Promise.all([
      apiRequest('/events?limit=12').catch(() => ({ items: [] })),
      apiRequest('/venues').catch(() => ({ items: [] })),
    ]).then(([eventRes, venueRes]) => {
      if (!active) return;
      const loadedEvents = (eventRes.items || []).map((e, index) => publicEvent(e, index));
      const loadedVenues = (venueRes.items || []).map(publicVenue);
      setEvents(loadedEvents);
      setVenues(loadedVenues);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    loadData();
    window.addEventListener('eventoria:data-changed', loadData);
    window.addEventListener('focus', loadData);
    return () => {
      window.removeEventListener('eventoria:data-changed', loadData);
      window.removeEventListener('focus', loadData);
    };
  }, [loadData]);

  // Handle escape key to close details modals
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelectedEvent(null);
        setSelectedVenue(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pageSize = 4;
  const visibleEvents = events.slice(eventPage * pageSize, (eventPage + 1) * pageSize);
  const visibleVenues = venues.slice(venuePage * pageSize, (venuePage + 1) * pageSize);

  const prevEvents = () => setEventPage(p => Math.max(0, p - 1));
  const nextEvents = () => setEventPage(p => (p + 1) * pageSize < events.length ? p + 1 : p);

  const prevVenues = () => setVenuePage(p => Math.max(0, p - 1));
  const nextVenues = () => setVenuePage(p => (p + 1) * pageSize < venues.length ? p + 1 : p);

  return (
    <main className="discovery">
      {/* Featured Events */}
      <section className="listing wrap" id="events">
        <SectionTitle kicker="FEATURED EVENTS" title="Trending" accent="Events" desc="Happening Near You" />
        <div className="title-sub">Explore the most exciting events and book your tickets before they’re gone!</div>
        {events.length > pageSize && (
          <CarouselButtons
            onPrev={prevEvents}
            onNext={nextEvents}
            hasPrev={eventPage > 0}
            hasNext={(eventPage + 1) * pageSize < events.length}
          />
        )}
        {loading ? (
          <p className="state-message">Loading verified events…</p>
        ) : events.length > 0 ? (
          <div className="cards">
            {visibleEvents.map(e => (
              <EventCard e={e} onSelect={setSelectedEvent} key={e.id} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: '18px', border: '1px dashed #e8dbe2' }}>
            <p style={{ margin: '0 0 16px', color: '#556075', fontSize: '15px' }}>No events published yet. Events added by organizers will be featured here.</p>
            <Link to="/organize#become-organizer" className="btn primary">Become an Organizer <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>

      {/* Popular Venues */}
      <section className="listing wrap" id="venues">
        <SectionTitle kicker="POPULAR VENUES" title="Extraordinary" accent="Venues" desc="for Your Special Occasions" />
        <div className="title-sub">From luxury banquet halls to outdoor spaces, find the perfect venue for weddings, parties, corporate events and more.</div>
        {venues.length > pageSize && (
          <CarouselButtons
            onPrev={prevVenues}
            onNext={nextVenues}
            hasPrev={venuePage > 0}
            hasNext={(venuePage + 1) * pageSize < venues.length}
          />
        )}
        {loading ? (
          <p className="state-message">Loading verified venues…</p>
        ) : venues.length > 0 ? (
          <div className="cards">
            {visibleVenues.map(v => (
              <VenueCard v={v} onSelect={setSelectedVenue} key={v.id || v.name} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: '18px', border: '1px dashed #e8dbe2' }}>
            <p style={{ margin: '0 0 16px', color: '#556075', fontSize: '15px' }}>No venues listed yet. Spaces added by verified venue owners will be featured here.</p>
            <Link to="/list-venue" className="btn primary">List Your Venue <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>

      {/* Rich Event Details Modal */}
      {selectedEvent && (
        <div
          className="guest-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedEvent.title} details`}
          onClick={(event) => event.target === event.currentTarget && setSelectedEvent(null)}
        >
          <article>
            <button
              className="guest-modal-close"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close details"
            >
              ×
            </button>
            <img src={selectedEvent.image} alt={selectedEvent.title} />
            <div className="guest-modal-copy">
              <span className="guest-type">{selectedEvent.type}</span>
              <h2>{selectedEvent.title}</h2>
              <p>
                <CalendarDays size={16} /> {selectedEvent.day} {selectedEvent.month} {new Date(selectedEvent.startsAt).getFullYear()} · {selectedEvent.time}
              </p>
              <p>
                <MapPin size={16} /> {selectedEvent.venue}, {selectedEvent.city}, Tamil Nadu
              </p>
              <div className="guest-facts">
                <span><b>{selectedEvent.price}</b> onwards</span>
                <span><b>{selectedEvent.remainingTickets !== undefined ? `${selectedEvent.remainingTickets} of ${selectedEvent.capacity} remaining` : selectedEvent.availability}</b></span>
                <span><b>{selectedEvent.mode}</b> event</span>
              </div>
              <p className="guest-description">
                {selectedEvent.description || "Enjoy a verified Eventoria experience with complete venue information, secure ticketing and clear event details."}
              </p>
              <div className="guest-actions">
                <button onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: selectedEvent.title, url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(window.location.href);
                    alert('Event link copied to clipboard!');
                  }
                }}>
                  <Share2 size={16} /> Share
                </button>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedEvent.venue}, ${selectedEvent.city}`)}`}
                >
                  <ExternalLink size={16} /> Map
                </a>
              </div>
              <div className="guest-reviews">
                <b>Guest rating</b>
                <span>★ 4.9 · “Clear details and seamless booking experience.”</span>
              </div>
              {selectedEvent.isCompleted ? (
                <button className="guest-book" disabled style={{ background: '#94a3b8', cursor: 'not-allowed', opacity: 0.8 }}>
                  Event Concluded <small>This event has ended</small>
                </button>
              ) : selectedEvent.isSoldOut ? (
                <button className="guest-book" disabled style={{ background: '#94a3b8', cursor: 'not-allowed', opacity: 0.8 }}>
                  Sold Out <small>All tickets booked</small>
                </button>
              ) : (
                <button
                  className="guest-book"
                  onClick={() => {
                    const target = selectedEvent;
                    setSelectedEvent(null);
                    navigate(`/booking/${target.id}`, { state: { event: target } });
                  }}
                >
                  Book Now <small>{user ? "Continue to booking" : "Login required"}</small>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </article>
        </div>
      )}

      {/* Rich Venue Details Modal */}
      {selectedVenue && (
        <div
          className="vn-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedVenue.name} details`}
          onClick={(event) => event.target === event.currentTarget && setSelectedVenue(null)}
        >
          <article>
            <button
              className="vn-modal-close"
              onClick={() => setSelectedVenue(null)}
              aria-label="Close venue details"
            >
              ×
            </button>
            <img src={selectedVenue.image} alt={selectedVenue.name} />
            <h2>{selectedVenue.name}</h2>
            <p><Building2 size={16} /> {selectedVenue.type}</p>
            <p><MapPin size={16} /> {selectedVenue.address ? `${selectedVenue.address}, ` : ''}{selectedVenue.city}, Tamil Nadu</p>
            <p><Users size={16} /> {selectedVenue.guests} guests capacity</p>
            <strong style={{ fontSize: '18px', color: '#0f172a', display: 'block', margin: '8px 0' }}>
              ₹ {selectedVenue.price.toLocaleString("en-IN")}/hr
            </strong>
            {selectedVenue.amenities && selectedVenue.amenities.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '10px 0' }}>
                {selectedVenue.amenities.map(a => (
                  <span key={a} style={{ fontSize: '12px', background: '#f1f5f9', color: '#334155', padding: '3px 9px', borderRadius: '12px', fontWeight: 600 }}>
                    ✓ {a}
                  </span>
                ))}
              </div>
            )}
            <div className="guest-facts">
              <span><b>Available</b> for reservations</span>
              <span><b>{selectedVenue.rating} ★</b> ({selectedVenue.reviews} reviews)</span>
            </div>
            <p className="guest-description">
              {selectedVenue.description || "A premier Eventoria verified venue with comprehensive facilities, transparent hourly pricing, and dedicated support."}
            </p>
            <div className="guest-actions">
              <button onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: selectedVenue.name, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('Venue link copied to clipboard!');
                }
              }}>
                <Share2 size={16} /> Share
              </button>
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedVenue.name}, ${selectedVenue.city}`)}`}
              >
                <ExternalLink size={16} /> Map
              </a>
            </div>
            <div className="guest-reviews">
              <b>Host reviews</b>
              <span>★ 4.8 · “Spacious facilities, modern lighting, and helpful on-site staff.”</span>
            </div>
            <button
              className="vn-enquire"
              onClick={() => {
                const target = selectedVenue;
                setSelectedVenue(null);
                navigate(`/venues?type=${encodeURIComponent(target.type || 'All Venues')}`);
              }}
            >
              Book / Enquire This Space <small>View calendar & check availability</small>
              <ArrowRight size={16} />
            </button>
          </article>
        </div>
      )}
    </main>
  );
}

const benefits = [['Wide Variety', 'Thousands of events and venues', Sparkles], ['Best Prices', 'Exclusive deals and offers', Tag], ['Secure Booking', 'Safe & reliable payments', ShieldCheck], ['24/7 Support', 'Always here to help you', Headphones]];
function Why() { return <section className="why"><div className="wrap why-grid"><div className="why-copy"><p className="eyebrow">WHY EVENTORIA?</p><h2>More Than Just Events & Venues</h2><p>A complete platform for event discovery, venue booking, and seamless event management.</p><div className="benefits">{benefits.map(([a, b, I]) => <div key={a}><i><I /></i><b>{a}</b><span>{b}</span></div>)}</div></div><div className="why-image" style={{ backgroundImage: `url(${img.why})` }}><p>Good<br />Celebrations<br /><em>Never end!</em></p></div></div></section> }

function Wedding() { return <section className="wedding wrap"><div className="wedding-copy"><p className="eyebrow">WEDDING SPECIAL</p><h2>Your Dream<br /><em>Wedding Starts Here</em></h2><p>Beautiful venues, trusted vendors and everything you need to make your big day perfect.</p><button className="btn wedding-btn">Explore Wedding Venues <ArrowRight /></button><div className="wedding-features"><span><Building2 /><b>Stunning Venues</b></span><span><Users /><b>Trusted Vendors</b></span><span><Gift /><b>Customized Packages</b></span></div></div><div className="wedding-visual" style={{ backgroundImage: `url(${img.wedding})` }} /></section> }

function Phone({ second = false }) { return <div className={`phone ${second ? 'second' : ''}`}><div className="notch" /><div className="phone-logo"><Logo /></div><div className="phone-search"><Search /> Search events...</div><div className="phone-cats"><span>🎵</span><span>💍</span><span>🎉</span><span>⚽</span></div><img src={second ? img.venue3 : img.event1} alt="Eventoria app preview" /><b>{second ? 'Verified Venues' : 'Live Experiences'}</b><small>{second ? 'Resorts • Banquet • Halls' : 'Concerts • Sports • Meets'}</small></div> }
function AppPromo() { const points = [[Sparkles, 'Discover Events', 'Near You'], [CalendarDays, 'Book Venues', 'For Any Occasion'], [Ticket, 'Manage Bookings', 'Easily'], [Smartphone, 'Digital Tickets', 'With QR Code'], [MapPin, 'Exclusive Offers', '& Discounts']]; return <section className="app-promo"><div className="wrap app-grid"><div><p className="eyebrow">ON THE GO</p><h2>Events & Venues<br /><em>in Your Pocket</em></h2><p>Download our app and get instant access to the best events, venues and exclusive offers.</p><div className="stores"><button> <span><small>Download on the</small>App Store</span></button><button>▶ <span><small>GET IT ON</small>Google Play</span></button></div></div><div className="phones"><Phone /><Phone second /></div><div className="app-points">{points.map(([I, a, b]) => <div key={a}><i><I /></i><span><b>{a}</b><small>{b}</small></span></div>)}</div></div></section> }

const testimonials = [['Priya', '“Amazing platform! Found the perfect venue for my wedding. The booking process was so easy.”', '/images/testimonial-priya.png'], ['Rajesh Kumar', '“Booked concert tickets in minutes. Great experience and excellent support!”', '/images/testimonial-rahul.png'], ['Sneha', '“The best place to find unique events and venues. Highly recommended!”', '/images/testimonial-sneha.png']];
function Testimonials() { return <section className="testimonials wrap"><p className="eyebrow">TESTIMONIALS</p><h2>What Our Users Say</h2><CarouselButtons /><div className="quotes">{testimonials.map(([n, q, photo]) => <article key={n}><img className="avatar" src={photo} alt={n} /><div><b>{n}</b><div className="stars" aria-label="5 out of 5 stars">{[0, 1, 2, 3, 4].map(i => <span aria-hidden="true" key={i}>★</span>)}</div><p>{q}</p></div></article>)}</div></section> }

function CTA() { return <><section className="dual-cta wrap"><article className="organizer"><img className="cta-photo" src={img.why} alt="Live event stage and audience" /><div className="cta-shade" /><i><Ticket /></i><div className="cta-content"><h3>Are You an Event Organizer?</h3><p>Reach more people, sell tickets online and manage your events with ease.</p><Link className="btn white" to="/organize#become-organizer">Become an Organizer <ArrowRight /></Link></div></article><article className="venue-cta"><img className="cta-photo" src={img.venue1} alt="Elegant event venue" /><div className="cta-shade" /><i><Building2 /></i><div className="cta-content"><h3>List Your Venue</h3><p>Showcase your venue to thousands of event planners and customers.</p><Link className="btn dark" to="/list-venue">List Your Venue <ArrowRight /></Link></div></article></section><section className="newsletter wrap"><i><Mail /></i><div><small>Stay Updated</small><h3>Get the Latest Events & Offers</h3><p>Subscribe to our newsletter and never miss an amazing event or deal.</p></div><form onSubmit={e => e.preventDefault()}><input type="email" aria-label="Email" placeholder="Enter your email address" /><button>Subscribe <ArrowRight /></button></form></section></> }

function Footer() { return <SiteFooter /> }

function HomePage() {
  React.useEffect(() => {
    const handleHomeButtonClick = (e) => {
      const btn = e.target.closest(
        'button, .btn, a.btn, [role="button"], input[type="submit"], nav a, nav button, header a, header button, .evx-topbar a, .evx-topbar button, .categories a, .subcategory-list button, .tabs button, .popular button, .story button, .carousel-btn, .vn-enquire, .wedding-btn, .stores button, .header-actions a, .menu, a.org-create'
      );
      if (btn) {
        fireButtonPopper(e);
      }
    };

    window.addEventListener('click', handleHomeButtonClick, { capture: true });
    return () => window.removeEventListener('click', handleHomeButtonClick, { capture: true });
  }, []);

  return (
    <div className="homepage-container">
      <Hero />
      <Categories />
      <Listings />
      <Why />
      <Wedding />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}

function ScrollToTop() { const { pathname } = useLocation(); React.useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [pathname]); return null }

export function App() { return <Routes><Route path="/" element={<HomePage />} /><Route path="/discover" element={<CatalogPage />} /><Route path="/venues" element={<VenuesPage />} /><Route path="/organize" element={<OrganizePage />} /><Route path="/list-venue" element={<ListVenuePage />} /><Route path="/auth/:mode" element={<AuthPage />} /><Route path="/booking/:eventId" element={<BookingPage />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/portal/:portal" element={<RolePortalPage />} /><Route path="/scanner" element={<TicketScannerPage />} /><Route path="*" element={<main className="state-message"><h1>Page not found</h1><Link to="/">Return home</Link></main>} /></Routes> }

const rootElement = document.getElementById('root');
if (rootElement) createRoot(rootElement).render(<BrowserRouter><ScrollToTop /><AuthProvider><App /></AuthProvider></BrowserRouter>);
