import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import { apiRequest } from "../../services/apiClient.js";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  House,
  Mail,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Music2,
  Search,
  Share2,
  GitCompareArrows,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Store,
  Ticket,
  Trophy,
  Users,
  X,
} from "lucide-react";

const categories = [
  ["All Events", Sparkles],
  ["Concerts", Music2],
  ["Parties", Users],
  ["Business Events", BriefcaseBusiness],
  ["Sports", Trophy],
  ["Festivals", Sparkles],
  ["Workshops", Ticket],
  ["Exhibitions", Store],
];

const eventData = [];
export { eventData };

export const publicEvent = (event, index = 0) => {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const prices = (event.ticketTypes || []).map((ticket) => ticket.priceMinor / 100);
  const capacity = event.totalCapacity ?? (event.ticketTypes || []).reduce((sum, ticket) => sum + (ticket.capacity || 0), 0);
  const used = event.totalSold ?? (event.ticketTypes || []).reduce((sum, ticket) => sum + (ticket.sold || 0) + (ticket.reserved || 0), 0);
  const remainingTickets = event.remainingTickets ?? Math.max(0, capacity - used);
  const isSoldOut = capacity > 0 && remainingTickets === 0;
  const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.valueOf());
  const formatTime = (date) => isValidDate(date) ? date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";

  return {
    id: event._id || event.id,
    image: event.images?.[0] || "/images/hero1.png",
    day: isValidDate(start) ? String(start.getDate()).padStart(2, "0") : "01",
    month: isValidDate(start) ? start.toLocaleString("en-IN", { month: "short" }).toUpperCase() : "EVENT",
    title: event.title || "Untitled Event",
    artist: event.organizer?.name || "",
    type: event.subcategory || event.category || "Events",
    venue: event.venueName || event.location?.address || "Venue to be announced",
    time: isValidDate(start) ? `${formatTime(start)} - ${formatTime(end)}` : "Time to be announced",
    price: `₹ ${(prices.length ? Math.min(...prices) : 0).toLocaleString("en-IN")}`,
    city: event.location?.city || "",
    priceValue: prices.length ? Math.min(...prices) : 0,
    startsAt: event.startsAt,
    mode: "In-Person Events",
    capacity,
    used,
    remainingTickets,
    isSoldOut,
    availability: isSoldOut ? "Sold Out" : "Available Tickets",
    recommendation: 100 - index,
  };
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const matchesDateSelection = (startsAt, selection, now = new Date()) => {
  if (selection === "Any date") return true;
  const eventDay = startOfDay(startsAt);
  const today = startOfDay(now);
  if (/^\d{4}-\d{2}-\d{2}$/.test(selection)) {
    const [year, month, day] = selection.split("-").map(Number);
    const selectedDay = new Date(year, month - 1, day);
    return eventDay.getTime() === selectedDay.getTime();
  }
  if (selection === "Today") return eventDay.getTime() === today.getTime();
  if (selection === "Tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return eventDay.getTime() === tomorrow.getTime();
  }
  if (selection === "This Month") {
    return (
      eventDay.getFullYear() === today.getFullYear() &&
      eventDay.getMonth() === today.getMonth()
    );
  }
  if (selection === "This Weekend") {
    const saturday = new Date(today);
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
    saturday.setDate(today.getDate() + daysUntilSaturday);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    return eventDay >= saturday && eventDay <= sunday;
  }
  return true;
};
const filterGroups = [
  {
    title: "Event Category",
    items: [
      "Concerts",
      "Parties",
      "Business Events",
      "Sports",
      "Festivals",
      "Workshops",
      "Exhibitions",
    ],
  },
  {
    title: "Event Type",
    items: ["Online Events", "In-Person Events", "Hybrid Events"],
  },
  { title: "Availability", items: ["Available Tickets", "Sold Out"] },
];

function Logo({ light = false }) {
  return (
    <Link className={`evx-logo ${light ? "light" : ""}`} to="/">
      <span>✦</span>
      <div>
        <b>Eventoria</b>
        <small>Events Beyond Ordinary</small>
      </div>
    </Link>
  );
}
export function Topbar({ home = false, active = home ? "home" : "events" }) {
  const [open, setOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = async () => { await logout(); setAccountOpen(false); navigate("/"); };
  return (
    <header className="evx-topbar">
      <Logo />
      <button
        className="evx-menu"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "open" : ""}>
        <Link className={active === "home" ? "active" : ""} to="/" onClick={() => setOpen(false)}><House/><span>Home</span></Link>
        <Link className={active === "events" ? "active" : ""} to="/discover" onClick={() => setOpen(false)}>
          <CalendarDays/><span>Events</span>
        </Link>
        <Link className={active === "venues" ? "active" : ""} to="/venues" onClick={() => setOpen(false)}><MapPin/><span>Venues</span></Link>
        <Link className={active === "organize" ? "active" : ""} to={user?.roles?.includes('event_organizer') ? '/portal/organizer' : '/organize#become-organizer'} onClick={() => setOpen(false)}><Users/><span>{user?.roles?.includes('event_organizer') ? 'Manage Events' : 'Become an Organizer'}</span></Link>
        <Link className={active === "list" ? "active" : ""} to="/list-venue" onClick={() => setOpen(false)}><Store/><span>List Your Venue</span></Link>
      </nav>
      <div className="evx-account">
        {user ? <div className="evx-user-menu"><button type="button" className="evx-user-trigger" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}><span className="evx-user-avatar">{user.name?.charAt(0).toUpperCase() || "U"}</span><span><b>{user.name}</b></span><ChevronDown/></button>{accountOpen&&<div className="evx-user-dropdown"><div><CircleUserRound/><span><b>{user.name}</b><small>{user.email}</small></span></div><Link to="/dashboard" onClick={() => setAccountOpen(false)}><LayoutDashboard/> My Dashboard</Link><button type="button" onClick={signOut}><LogOut/> Logout</button></div>}</div> : <><Link to="/auth/login">Login</Link><Link className="signup" to="/auth/register">Sign Up <ArrowRight/></Link></>}
      </div>
    </header>
  );
}
function Filters({ selected, toggle, clear }) {
  const [maxPrice, setMaxPrice] = React.useState(1500);
  const apply = () =>
    window.dispatchEvent(
      new CustomEvent("eventoria:apply-filters", {
        detail: { selected, maxPrice },
      }),
    );
  const reset = () => {
    setMaxPrice(1500);
    clear();
  };
  return (
    <aside className="evx-filters">
      <div className="evx-filter-head">
        <h2>
          <SlidersHorizontal /> Filters
        </h2>
        <button type="button" onClick={reset}>
          Clear All
        </button>
      </div>
      {filterGroups.map((group) => (
        <section key={group.title}>
          <h3>
            {group.title}
            <ChevronDown />
          </h3>
          {group.items.map((item) => {
            const checked =
              group.title === "Date" && item === "Any date"
                ? selected.Date.length === 0
                : selected[group.title].includes(item);
            return (
              <label key={item}>
                <button
                  type="button"
                  className={checked ? "checked" : ""}
                  onClick={() => toggle(group.title, item)}
                  aria-label={`Filter by ${item}`}
                  aria-pressed={checked}
                >
                  {checked && <Check />}
                </button>
                <span>{item}</span>
              </label>
            );
          })}
        </section>
      ))}
      <section className="evx-price-filter">
        <h3>
          Maximum Price <ChevronDown />
        </h3>
        <input
          type="range"
          min="0"
          max="1500"
          step="50"
          value={maxPrice}
          onChange={(event) => setMaxPrice(Number(event.target.value))}
          aria-label="Maximum event price"
        />
        <div>
          <span>₹ 0</span>
          <strong>Up to ₹ {maxPrice.toLocaleString("en-IN")}</strong>
        </div>
      </section>
      <button type="button" className="evx-apply-filters" onClick={apply}>
        Apply Filters <ArrowRight />
      </button>
    </aside>
  );
}
function EventCard({ event, index, onView }) {
  const { user } = useAuth();
  const owner = encodeURIComponent(user?._id || user?.id || user?.email?.toLowerCase() || "guest");
  const storageKey = `eventoria:wishlist:${owner}:event:${event.id}`;
  const [liked, setLiked] = React.useState(() => Boolean(localStorage.getItem(storageKey)));
  React.useEffect(() => setLiked(Boolean(localStorage.getItem(storageKey))), [storageKey]);
  const toggleLiked = () => setLiked((current) => {
    const next = !current;
    if (next) localStorage.setItem(storageKey, JSON.stringify(event));
    else localStorage.removeItem(storageKey);
    return next;
  });
  return (
    <article className="evx-card">
      <div className="evx-card-photo">
        <img src={event.image} alt="" />
        <button
          className={liked ? "liked" : ""}
          onClick={toggleLiked}
          aria-label="Save event"
        >
          <Heart fill={liked ? "currentColor" : "none"} />
        </button>
        <div className="evx-date">
          <b>{event.day}</b>
          <span>{event.month}</span>
          <small>{new Date(event.startsAt).getFullYear()}</small>
        </div>
      </div>
      <div className="evx-card-copy">
        <h3>{event.title}</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '4px 0 6px' }}>
          <span className={`evx-tag t${index % 7}`}>{event.type}</span>
          {event.capacity > 0 && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: event.isSoldOut ? '#fee2e2' : (event.remainingTickets < 25 ? '#ffedd5' : '#ecfdf5'),
              color: event.isSoldOut ? '#991b1b' : (event.remainingTickets < 25 ? '#c2410c' : '#047857'),
              border: `1px solid ${event.isSoldOut ? '#fecaca' : (event.remainingTickets < 25 ? '#fed7aa' : '#a7f3d0')}`
            }}>
              {event.isSoldOut ? 'Sold Out' : `🎟️ ${event.remainingTickets} / ${event.capacity} left`}
            </span>
          )}
        </div>
        <p>
          <MapPin /> {event.venue},<br />
          <i /> {event.city}, Tamil Nadu
        </p>
        <p>
          <CalendarDays /> {event.time}
        </p>
        <div className="evx-price">
          From <b>{event.price}</b>
          <button onClick={() => onView(event)} aria-label={`View ${event.title}`}>
            <ArrowRight />
          </button>
        </div>
      </div>
    </article>
  );
}
export default function CatalogPage() {
  const [catalogEvents, setCatalogEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const requestedCategory = searchParams.get("category");
  const initialCategory = categories.some(
    ([name]) => name === requestedCategory,
  )
    ? requestedCategory
    : "All Events";
  const [category, setCategory] = React.useState(initialCategory);
  const [selected, setSelected] = React.useState({
    Date: [],
    "Event Category": [],
    "Event Type": [],
    Availability: [],
  });
  const [applied, setApplied] = React.useState({
    Date: [],
    "Event Category": [],
    "Event Type": [],
    Availability: [],
  });
  const [appliedMaxPrice, setAppliedMaxPrice] = React.useState(1500);
  const [query, setQuery] = React.useState(initialQuery);
  const [queryDraft, setQueryDraft] = React.useState(initialQuery);
  const [locationDraft, setLocationDraft] = React.useState("Salem");
  const [dateDraft, setDateDraft] = React.useState("Any date");
  const [appliedLocation, setAppliedLocation] = React.useState("All locations");
  const [appliedDate, setAppliedDate] = React.useState("Any date");
  const [openDropdown, setOpenDropdown] = React.useState(null);
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [guestNotice, setGuestNotice] = React.useState("");
  React.useEffect(() => {
    let active = true;
    const load = () => {
      setLoading(true);
      return apiRequest('/events?limit=50')
        .then((result) => {
          if (active) {
            setCatalogEvents((result.items || []).map((item, index) => ({
              ...publicEvent(item, index),
              endsAt: item.endsAt,
              ticketTypes: item.ticketTypes || [],
            })));
          }
        })
        .catch(() => {
          if (active) setCatalogEvents([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    load();
    window.addEventListener('eventoria:data-changed', load);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      window.removeEventListener('eventoria:data-changed', load);
      window.removeEventListener('focus', load);
    };
  }, []);
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const selectedDateLabel = /^\d{4}-\d{2}-\d{2}$/.test(dateDraft)
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(
        new Date(
          ...dateDraft.split("-").map((part, index) =>
            index === 1 ? Number(part) - 1 : Number(part),
          ),
        ),
      )
    : "Any date";
  const calendarDays = React.useMemo(() => {
    const firstCell = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1 - calendarMonth.getDay(),
    );
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCell);
      date.setDate(firstCell.getDate() + index);
      return date;
    });
  }, [calendarMonth]);
  const toDateValue = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const availableDateValues = React.useMemo(() => {
    const searchTerm = queryDraft.trim().toLowerCase();
    return new Set(
      catalogEvents
        .filter((event) => {
          const matchesLocation =
            locationDraft === "All locations" || event.city === locationDraft;
          const matchesCategory =
            category === "All Events" || event.type === category;
          const matchesQuery =
            !searchTerm ||
            `${event.title} ${event.artist || ""} ${event.type} ${event.venue}`
              .toLowerCase()
              .includes(searchTerm);
          return matchesLocation && matchesCategory && matchesQuery;
        })
        .map((event) => toDateValue(new Date(event.startsAt))),
    );
  }, [catalogEvents, category, locationDraft, queryDraft]);
  const selectCalendarDate = (date) => {
    const value = toDateValue(date);
    setDateDraft(value);
    setAppliedDate(value);
    setQuery(queryDraft.trim());
    setAppliedLocation(locationDraft);
    setOpenDropdown(null);
  };
  const [page, setPage] = React.useState(1);
  const [extra, setExtra] = React.useState(0);
  const toggle = (group, item) =>
    setSelected((current) => {
      if (group === "Date" && item === "Any date")
        return { ...current, Date: [] };
      const values = current[group];
      const next = values.includes(item)
        ? values.filter((value) => value !== item)
        : group === "Date"
          ? [item]
          : [...values, item];
      return { ...current, [group]: next };
    });
  const clear = () => {
    const empty = {
      Date: [],
      "Event Category": [],
      "Event Type": [],
      Availability: [],
    };
    setSelected(empty);
    setApplied(empty);
    setAppliedMaxPrice(1500);
    setCategory("All Events");
    setQuery("");
    setQueryDraft("");
    setLocationDraft("Salem");
    setDateDraft("Any date");
    setAppliedLocation("All locations");
    setAppliedDate("Any date");
    setOpenDropdown(null);
  };
  React.useEffect(() => {
    const applyFilters = (event) => {
      setApplied({ ...event.detail.selected });
      setAppliedMaxPrice(event.detail.maxPrice);
    };
    window.addEventListener("eventoria:apply-filters", applyFilters);
    return () =>
      window.removeEventListener("eventoria:apply-filters", applyFilters);
  }, []);
  const filtered = catalogEvents.filter((event) => {
    const matchesSearch =
      !query ||
      `${event.title} ${event.artist || ""} ${event.type} ${event.venue}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
    const matchesTopCategory =
      category === "All Events" || event.type === category;
    const matchesLocation =
      appliedLocation === "All locations" || event.city === appliedLocation;
    const matchesCategory =
      !applied["Event Category"].length ||
      applied["Event Category"].includes(event.type);
    const matchesDate =
      matchesDateSelection(event.startsAt, appliedDate) &&
      (!applied.Date.length ||
        applied.Date.some((selection) =>
          matchesDateSelection(event.startsAt, selection),
        ) ||
        applied.Date.includes("Custom Date"));
    const matchesMode =
      !applied["Event Type"].length ||
      applied["Event Type"].includes(event.mode);
    const matchesAvailability =
      !applied.Availability.length ||
      applied.Availability.includes(event.availability);
    const matchesPrice = event.priceValue <= appliedMaxPrice;
    return (
      matchesSearch &&
      matchesTopCategory &&
      matchesLocation &&
      matchesCategory &&
      matchesDate &&
      matchesMode &&
      matchesAvailability &&
      matchesPrice
    );
  });
  const sorted = [...filtered].sort(
    (a, b) => b.recommendation - a.recommendation,
  );
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const start = (page - 1) * pageSize;
  const shown = sorted.slice(start, start + pageSize + extra);
  const canLoadMore = start + pageSize + extra < sorted.length;
  React.useEffect(() => {
    setPage(1);
    setExtra(0);
  }, [category, query, appliedLocation, appliedDate, applied, appliedMaxPrice]);
  const submitSearch = (event) => {
    event.preventDefault();
    setQuery(queryDraft.trim());
    setAppliedLocation(locationDraft);
    setAppliedDate(dateDraft);
    setOpenDropdown(null);
  };
  const goToPage = (next) => {
    setPage(Math.min(Math.max(next, 1), totalPages));
    setExtra(0);
    document
      .getElementById("events")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const shareItem = async (item) => {
    const data = { title: item.title, text: `View ${item.title} on Eventoria`, url: window.location.href };
    if (navigator.share) await navigator.share(data).catch(() => null);
    else { await navigator.clipboard?.writeText(window.location.href); setGuestNotice("Event link copied."); }
  };
  const compareItem = (item) => {
    const current = JSON.parse(localStorage.getItem("eventoria:compare:events") || "[]");
    const next = [...current.filter((id) => id !== item.id), item.id].slice(-3);
    localStorage.setItem("eventoria:compare:events", JSON.stringify(next));
    setGuestNotice(`Added to compare (${next.length}/3).`);
  };
  const bookItem = (item) => {
    if (!user) {
      navigate("/auth/login", { state: { from: "/discover", booking: item.id } });
      return;
    }
    setSelectedEvent(null);
    navigate(`/booking/${item.id}`, { state: { event: item } });
  };
  return (
    <div className="evx-page">
      <Topbar />
      <section className="evx-hero">
        <div className="evx-hero-copy">
          <p>
            <span /> EVENTS <span />
          </p>
          <h1>
            Discover Amazing
            <br />
            <em>Events</em> Near You
          </h1>
          <div>
            Explore concerts, festivals, workshops, business events, sports,
            <br /> exhibitions and more — all in one place.
          </div>
        </div>
      </section>
      <form className="evx-search" onSubmit={submitSearch}>
        <label>
          <Search />
          <input
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            placeholder="Search events, artists, or categories"
            aria-label="Search events, artists, or categories"
          />
        </label>
        <div className="evx-search-select">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown((current) =>
                current === "location" ? null : "location",
              )
            }
            aria-haspopup="listbox"
            aria-expanded={openDropdown === "location"}
          >
            <MapPin />
            <span>
              {locationDraft === "All locations"
                ? locationDraft
                : `${locationDraft}, Tamil Nadu`}
            </span>
            <ChevronDown />
          </button>
          {openDropdown === "location" && (
            <div className="evx-search-menu" role="listbox" aria-label="Location">
              {["All locations", "Salem", "Chennai", "Bengaluru", "Coimbatore"].map(
                (location) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={locationDraft === location}
                    className={locationDraft === location ? "active" : ""}
                    key={location}
                    onClick={() => {
                      setLocationDraft(location);
                      setOpenDropdown(null);
                    }}
                  >
                    {location}
                    {locationDraft === location && <Check />}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
        <div className="evx-search-select">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown((current) =>
                current === "date" ? null : "date",
              )
            }
            aria-haspopup="listbox"
            aria-expanded={openDropdown === "date"}
          >
            <CalendarDays />
            <span>{selectedDateLabel}</span>
            <ChevronDown />
          </button>
          {openDropdown === "date" && (
            <div className="evx-search-menu evx-calendar" aria-label="Select event date">
              <div className="evx-calendar-head">
                <strong>
                  {new Intl.DateTimeFormat("en-IN", {
                    month: "long",
                    year: "numeric",
                  }).format(calendarMonth)}
                </strong>
                <span>
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(current.getFullYear(), current.getMonth() - 1, 1),
                      )
                    }
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(current.getFullYear(), current.getMonth() + 1, 1),
                      )
                    }
                  >
                    <ChevronRight />
                  </button>
                </span>
              </div>
              <div className="evx-calendar-weekdays" aria-hidden="true">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className="evx-calendar-grid">
                {calendarDays.map((date) => {
                  const value = toDateValue(date);
                  const outside = date.getMonth() !== calendarMonth.getMonth();
                  const hasEvents = availableDateValues.has(value);
                  return (
                    <button
                      type="button"
                      key={value}
                      className={`${outside ? "outside" : ""} ${hasEvents ? "available" : "unavailable"} ${dateDraft === value ? "selected" : ""}`}
                      aria-label={new Intl.DateTimeFormat("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(date)}
                      aria-pressed={dateDraft === value}
                      disabled={!hasEvents}
                      onClick={() => selectCalendarDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="evx-calendar-clear"
                onClick={() => {
                  setDateDraft("Any date");
                  setAppliedDate("Any date");
                  setOpenDropdown(null);
                }}
              >
                Clear date
              </button>
            </div>
          )}
        </div>
        <button type="submit" className="evx-search-submit">
          Search <ArrowRight />
        </button>
      </form>
      <div className="evx-category-row">
        {categories.map(([name, Icon]) => (
          <button
            key={name}
            className={category === name ? "active" : ""}
            onClick={() => setCategory(name)}
          >
            <span>
              <Icon />
            </span>
            {name}
          </button>
        ))}
      </div>
      <main className="evx-content">
        <Filters selected={selected} toggle={toggle} clear={clear} />
        <section className="evx-results" id="events">
          <div className="evx-results-head">
            <b>{loading ? "Searching events…" : `${sorted.length} Events Found`}</b>
          </div>
          {loading ? (
            <p className="state-message">Loading verified events…</p>
          ) : (
            <>
              <div className="evx-grid">
                {shown.map((event, index) => (
                  <EventCard event={event} index={index} onView={setSelectedEvent} key={event.id} />
                ))}
              </div>
              {!shown.length && (
                <div className="evx-empty">
                  <h3>No events found</h3>
                  <p>Only events created by approved organizers are displayed. Events will appear here once published.</p>
                  <div style={{ marginTop: "16px", display: "flex", gap: "12px", justifyContent: "center" }}>
                    <Link to="/organize#become-organizer" className="btn primary">Become an Organizer</Link>
                    <button type="button" onClick={clear} className="btn ghost">Clear filters</button>
                  </div>
                </div>
              )}
            </>
          )}
          {sorted.length > 0 && (
            <div className="evx-pagination">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (number) => (
                  <button
                    key={number}
                    className={page === number ? "active" : ""}
                    onClick={() => goToPage(number)}
                  >
                    {number}
                  </button>
                ),
              )}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <ChevronRight />
              </button>
              <button
                className="load"
                onClick={() => setExtra((value) => value + 4)}
                disabled={!canLoadMore}
              >
                {canLoadMore ? "↻  Load More Events" : "All Events Loaded"}
              </button>
            </div>
          )}
        </section>
      </main>
      {selectedEvent && <div className="guest-modal" role="dialog" aria-modal="true" aria-label={`${selectedEvent.title} details`} onClick={(event) => event.target === event.currentTarget && setSelectedEvent(null)}><article><button className="guest-modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close details">×</button><img src={selectedEvent.image} alt={selectedEvent.title}/><div className="guest-modal-copy"><span className="guest-type">{selectedEvent.type}</span><h2>{selectedEvent.title}</h2><p><CalendarDays/> {selectedEvent.day} {selectedEvent.month} {new Date(selectedEvent.startsAt).getFullYear()} · {selectedEvent.time}</p><p><MapPin/> {selectedEvent.venue}, {selectedEvent.city}, Tamil Nadu</p><div className="guest-facts"><span><b>{selectedEvent.price}</b> onwards</span><span><b>{selectedEvent.remainingTickets !== undefined ? `${selectedEvent.remainingTickets} of ${selectedEvent.capacity} remaining` : selectedEvent.availability}</b></span><span><b>{selectedEvent.mode}</b> event</span></div><p className="guest-description">Enjoy a verified Eventoria experience with complete venue information, secure ticketing and clear event details.</p><div className="guest-actions"><button onClick={() => shareItem(selectedEvent)}><Share2/> Share</button><button onClick={() => compareItem(selectedEvent)}><GitCompareArrows/> Compare</button><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedEvent.venue}, ${selectedEvent.city}`)}`}><ExternalLink/> Map</a></div><div className="guest-reviews"><b>Guest reviews</b><span>★ 4.8 · “Clear details and a smooth booking experience.”</span></div>{guestNotice&&<small className="guest-notice">{guestNotice}</small>}<button className="guest-book" onClick={() => bookItem(selectedEvent)}>Book Now <small>{user ? "Continue to booking" : "Login required"}</small><ArrowRight/></button></div></article></div>}
      <section className="evx-news">
        <div>
          <small>Stay Updated</small>
          <h2>
            Never Miss <em>an Event</em>
          </h2>
          <p>
            Subscribe to get the latest events, exclusive offers and
            <br /> personalized recommendations directly to your inbox.
          </p>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <Mail />
          <input type="email" placeholder="Enter your email address" />
          <button>
            Subscribe <ArrowRight />
          </button>
        </form>
      </section>
      <div className="evx-legacy-footer" hidden>
        <div>
          <Logo light />
          <p>
            Discover amazing events and venues
            <br />
            for every occasion. Making celebrations
            <br />
            easier, one booking at a time.
          </p>
          <div className="evx-social">
            <b>f</b>
            <b>◎</b>
            <b>▶</b>
            <b>𝕏</b>
            <b>in</b>
          </div>
        </div>
        <div>
          <b>Quick Links</b>
          <a>Home</a>
          <a>Events</a>
          <a>Venues</a>
          <a>Organize Event</a>
          <a>List Your Venue</a>
        </div>
        <div>
          <b>Support</b>
          <a>Help Center</a>
          <a>Contact Us</a>
          <a>Booking Guide</a>
          <a>Terms & Conditions</a>
          <a>Privacy Policy</a>
        </div>
        <div>
          <b>For Organizers</b>
          <a>Create an Event</a>
          <a>Manage Events</a>
          <a>Pricing</a>
          <a>Organizer Guide</a>
        </div>
        <div>
          <b>Contact Us</b>
          <a>✉ &nbsp; support@eventoria.in</a>
          <a>☎ &nbsp; +91 98765 43210</a>
          <a>⌖ &nbsp; Salem, Tamil Nadu</a>
        </div>
        <div className="evx-copy">
          © 2026 Eventoria. All rights reserved.
          <span>
            Made with <em>♥</em> for unforgettable moments!
          </span>
        </div>
      </div>
      <SiteFooter />
      <button className="evx-bell" aria-label="Notifications">
        <Bell />
      </button>
    </div>
  );
}
