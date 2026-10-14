import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
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
const events = [
  {
    image: "/images/concert.png",
    day: "15",
    month: "NOV",
    title: "Arijit Singh Live in Concert",
    artist: "Arijit Singh",
    type: "Concerts",
    venue: "Salem Indoor Stadium",
    time: "7:00 PM - 10:00 PM",
    price: "₹ 1,499",
  },
  {
    image: "/images/party.png",
    day: "22",
    month: "NOV",
    title: "Stand Up Comedy Night",
    artist: "Karthik Kumar",
    type: "Parties",
    venue: "Kalyani Auditorium",
    time: "7:00 PM - 9:30 PM",
    price: "₹ 499",
  },
  {
    image: "/images/business.png",
    day: "10",
    month: "DEC",
    title: "Tech Innovation Summit 2026",
    artist: "Future Tech Forum",
    type: "Business Events",
    venue: "Salem Convention Centre",
    time: "9:00 AM - 5:00 PM",
    price: "₹ 1,499",
  },
  {
    image: "/images/festival.png",
    day: "18",
    month: "JAN",
    title: "Food & Culture Festival",
    type: "Festivals",
    venue: "Salem Fair Grounds",
    time: "11:00 AM - 10:00 PM",
    price: "₹ 299",
  },
  {
    image: "/images/sports.png",
    day: "05",
    month: "FEB",
    title: "State Level Cricket Championship",
    type: "Sports",
    venue: "Salem District Stadium",
    time: "9:00 AM - 6:00 PM",
    price: "₹ 299",
  },
  {
    image: "/images/workshop.png",
    day: "28",
    month: "FEB",
    title: "Photography Workshop",
    type: "Workshops",
    venue: "Creativity Hub, Salem",
    time: "10:00 AM - 4:00 PM",
    price: "₹ 1,199",
  },
  {
    image: "/images/expo.png",
    day: "12",
    month: "JAN",
    title: "Art & Handicraft Exhibition",
    type: "Exhibitions",
    venue: "Salem Exhibition Centre",
    time: "10:00 AM - 8:00 PM",
    price: "₹ 149",
  },
  {
    image: "/images/hero4.png",
    day: "25",
    month: "JAN",
    title: "EDM Night – DJ Festival",
    artist: "DJ Chetas",
    type: "Parties",
    venue: "Urban Arena, Salem",
    time: "7:00 PM - 12:00 PM",
    price: "₹ 799",
  },
  {
    image: "/images/hero1.png",
    day: "14",
    month: "MAR",
    title: "Sunset Music Festival",
    artist: "The Local Train",
    type: "Concerts",
    venue: "Salem Open Grounds",
    time: "4:00 PM - 11:00 PM",
    price: "₹ 999",
  },
  {
    image: "/images/why-events.png",
    day: "03",
    month: "APR",
    title: "Business Networking Meet",
    type: "Business Events",
    venue: "Grand Estancia Hotel",
    time: "4:00 PM - 8:00 PM",
    price: "₹ 999",
  },
  {
    image: "/images/hero6.png",
    day: "18",
    month: "APR",
    title: "Cultural Dance Festival",
    type: "Festivals",
    venue: "Salem Arts Arena",
    time: "6:00 PM - 10:00 PM",
    price: "₹ 399",
  },
  {
    image: "/images/hero3.png",
    day: "30",
    month: "APR",
    title: "AI & Technology Workshop",
    type: "Workshops",
    venue: "Salem Tech Hub",
    time: "10:00 AM - 4:00 PM",
    price: "₹ 799",
  },
];
const eventData = events.map((event, index) => ({
  ...event,
  id: index + 1,
  city: [
    "Salem",
    "Chennai",
    "Bengaluru",
    "Salem",
    "Coimbatore",
    "Chennai",
    "Salem",
    "Bengaluru",
    "Coimbatore",
    "Salem",
    "Chennai",
    "Bengaluru",
  ][index],
  priceValue: Number(event.price.replace(/[^0-9]/g, "")),
  startsAt: [
    "2026-11-15T19:00:00+05:30",
    "2026-11-22T19:00:00+05:30",
    "2026-12-10T09:00:00+05:30",
    "2027-01-18T11:00:00+05:30",
    "2027-02-05T09:00:00+05:30",
    "2027-02-28T10:00:00+05:30",
    "2027-01-12T10:00:00+05:30",
    "2027-01-25T19:00:00+05:30",
    "2027-03-14T16:00:00+05:30",
    "2027-04-03T16:00:00+05:30",
    "2027-04-18T18:00:00+05:30",
    "2027-04-30T10:00:00+05:30",
  ][index],
  mode: [
    "In-Person Events",
    "In-Person Events",
    "Hybrid Events",
    "In-Person Events",
    "In-Person Events",
    "Online Events",
    "In-Person Events",
    "In-Person Events",
    "In-Person Events",
    "Hybrid Events",
    "In-Person Events",
    "Online Events",
  ][index],
  availability: index === 7 || index === 10 ? "Sold Out" : "Available Tickets",
  recommendation: [98, 91, 96, 89, 94, 86, 82, 93, 90, 88, 84, 87][index],
}));
export { eventData };

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
        <Link className={active === "organize" ? "active" : ""} to="/organize" onClick={() => setOpen(false)}><Users/><span>Organize Event</span></Link>
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
  const storageKey = `eventoria:wishlist:event:${event.id}`;
  const [liked, setLiked] = React.useState(() => localStorage.getItem(storageKey) === "1");
  const toggleLiked = () => setLiked((current) => { const next = !current; localStorage.setItem(storageKey, next ? "1" : "0"); return next; });
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
        <span className={`evx-tag t${index % 7}`}>{event.type}</span>
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
      eventData
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
  }, [category, locationDraft, queryDraft]);
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
  const filtered = eventData.filter((event) => {
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
  const bookItem = (item) => user ? navigate("/dashboard") : navigate("/auth/login", { state: { from: "/discover", booking: item.id } });
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
            <b>{sorted.length} Events Found</b>
          </div>
          <div className="evx-grid">
            {shown.map((event, index) => (
              <EventCard event={event} index={index} onView={setSelectedEvent} key={event.id} />
            ))}
          </div>
          {!shown.length && (
            <div className="evx-empty">
              No events match your filters.{" "}
              <button onClick={clear}>Clear all filters</button>
            </div>
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
      {selectedEvent && <div className="guest-modal" role="dialog" aria-modal="true" aria-label={`${selectedEvent.title} details`} onClick={(event) => event.target === event.currentTarget && setSelectedEvent(null)}><article><button className="guest-modal-close" onClick={() => setSelectedEvent(null)} aria-label="Close details">×</button><img src={selectedEvent.image} alt={selectedEvent.title}/><div className="guest-modal-copy"><span className="guest-type">{selectedEvent.type}</span><h2>{selectedEvent.title}</h2><p><CalendarDays/> {selectedEvent.day} {selectedEvent.month} {new Date(selectedEvent.startsAt).getFullYear()} · {selectedEvent.time}</p><p><MapPin/> {selectedEvent.venue}, {selectedEvent.city}, Tamil Nadu</p><div className="guest-facts"><span><b>{selectedEvent.price}</b> onwards</span><span><b>{selectedEvent.availability}</b> availability</span><span><b>{selectedEvent.mode}</b> event</span></div><p className="guest-description">Enjoy a verified Eventoria experience with complete venue information, secure ticketing and clear event details.</p><div className="guest-actions"><button onClick={() => shareItem(selectedEvent)}><Share2/> Share</button><button onClick={() => compareItem(selectedEvent)}><GitCompareArrows/> Compare</button><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedEvent.venue}, ${selectedEvent.city}`)}`}><ExternalLink/> Map</a></div><div className="guest-reviews"><b>Guest reviews</b><span>★ 4.8 · “Clear details and a smooth booking experience.”</span></div>{guestNotice&&<small className="guest-notice">{guestNotice}</small>}<button className="guest-book" onClick={() => bookItem(selectedEvent)}>Book Now <small>{user ? "Continue to booking" : "Login required"}</small><ArrowRight/></button></div></article></div>}
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
