import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Search,
  Share2,
  GitCompareArrows,
  ExternalLink,
  Info,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trees,
  Users,
} from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import { apiRequest } from "../../services/apiClient.js";

const venueData = [];
export { venueData };

export const publicVenue = (venue) => ({
  name: venue.name,
  id: venue._id,
  type: venue.type,
  city: venue.location?.city || venue.city || "",
  guests: `Up to ${Number(venue.capacity || 0).toLocaleString("en-IN")}`,
  capacity: venue.capacity || 0,
  price: Math.round((venue.priceMinorPerHour || 0) / 100),
  rating: "New",
  reviews: "0",
  image: venue.images?.[0] || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85",
});

const types = [
  "All Venues",
  "Banquet Halls",
  "Convention Centers",
  "Resorts",
  "Outdoor Spaces",
  "Hotels",
  "Lawns",
  "Unique Venues",
];

function VenueCard({ venue, onView }) {
  const { user } = useAuth();
  const owner = encodeURIComponent(user?._id || user?.id || user?.email?.toLowerCase() || "guest");
  const storageKey = `eventoria:wishlist:${owner}:venue:${venue.id || venue.name}`;
  const [liked, setLiked] = React.useState(() => Boolean(localStorage.getItem(storageKey)));
  React.useEffect(() => setLiked(Boolean(localStorage.getItem(storageKey))), [storageKey]);
  const toggleLiked = () => setLiked((current) => {
    const next = !current;
    if (next) localStorage.setItem(storageKey, JSON.stringify(venue));
    else localStorage.removeItem(storageKey);
    return next;
  });
  return (
    <article className="vn-card">
      <div className="vn-photo">
        <img src={venue.image} alt={venue.name} />
        <button
          onClick={toggleLiked}
          aria-label={`Save ${venue.name}`}
        >
          <Heart fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="vn-card-body">
        <h3>{venue.name}</h3>
        <div className="vn-rating">
          <Star fill="currentColor" /> {venue.rating}{" "}
          <span>({venue.reviews} reviews)</span>
        </div>
        <p>
          <Users /> {venue.guests} guests
        </p>
        <p>
          <MapPin /> {venue.city}, Tamil Nadu
        </p>
        <strong>From ₹ {venue.price.toLocaleString("en-IN")}/day</strong>
        <button className="vn-details" onClick={() => onView(venue)}>
          View Details <ArrowRight />
        </button>
      </div>
    </article>
  );
}

export default function VenuesPage() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState("");
  const [type, setType] = React.useState("All Venues");
  const [selectedTypes, setSelectedTypes] = React.useState([]);
  const [maxPrice, setMaxPrice] = React.useState(100000);
  const [location, setLocation] = React.useState("All locations");
  const [capacity, setCapacity] = React.useState(5000);
  const [page, setPage] = React.useState(1);
  const [selectedVenue, setSelectedVenue] = React.useState(null);
  const [guestNotice, setGuestNotice] = React.useState("");
  const [catalogVenues, setCatalogVenues] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let active = true;
    const load = () => {
      setLoading(true);
      return apiRequest('/venues')
        .then((result) => {
          if (active) setCatalogVenues((result.items || []).map(publicVenue));
        })
        .catch(() => {
          if (active) setCatalogVenues([]);
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
  const filtered = catalogVenues.filter(
    (v) =>
      (!query ||
        `${v.name} ${v.type} ${v.city}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (type === "All Venues" || v.type === type) &&
      (!selectedTypes.length || selectedTypes.includes(v.type)) &&
      (location === "All locations" || v.city === location) &&
      v.capacity <= capacity &&
      v.price <= maxPrice,
  );
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  React.useEffect(
    () => setPage(1),
    [query, type, selectedTypes, location, capacity, maxPrice],
  );
  const toggle = (value) =>
    setSelectedTypes((current) =>
      current.includes(value)
        ? current.filter((x) => x !== value)
        : [...current, value],
    );
  const clear = () => {
    setDraft("");
    setQuery("");
    setType("All Venues");
    setSelectedTypes([]);
    setMaxPrice(100000);
    setLocation("All locations");
    setCapacity(5000);
    setPage(1);
  };
  const availableLocations = React.useMemo(() => {
    const list = new Set(["All locations", "Salem", "Chennai", "Tiruchirappalli", "Yercaud", "Coimbatore"]);
    catalogVenues.forEach((v) => { if (v.city) list.add(v.city); });
    return Array.from(list);
  }, [catalogVenues]);

  const routerLocation = useLocation();
  const [bookingVenue, setBookingVenue] = React.useState(null);
  const [bookingForm, setBookingForm] = React.useState({ purpose: "", customerNotes: "" });
  const [bookingSchedule, setBookingSchedule] = React.useState({
    startDate: "",
    startTime: "10:00",
    startPeriod: "AM",
    endDate: "",
    endTime: "06:00",
    endPeriod: "PM",
  });
  const [bookingState, setBookingState] = React.useState({ busy: false, error: "", success: null });

  const parseScheduleDateTime = (dateStr, timeStr, period = "AM") => {
    if (!dateStr || !timeStr) return null;
    const clean = String(timeStr).trim().replace(".", ":");
    let [hStr, mStr] = clean.split(":");
    let hours = parseInt(hStr, 10);
    let minutes = mStr !== undefined ? parseInt(mStr, 10) : 0;
    if (isNaN(hours) || hours < 1 || hours > 12) return null;
    if (isNaN(minutes) || minutes < 0 || minutes > 59) return null;

    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
    return isNaN(dt.valueOf()) ? null : dt;
  };

  const bookVenue = (venue) => {
    if (!user) {
      navigate("/auth/login", { state: { from: "/venues", openVenueId: venue.id } });
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    setBookingVenue(venue);
    setBookingSchedule({
      startDate: tomorrowStr,
      startTime: "10:00",
      startPeriod: "AM",
      endDate: tomorrowStr,
      endTime: "06:00",
      endPeriod: "PM",
    });
    setBookingForm({ purpose: "", customerNotes: "" });
    setBookingState({ busy: false, error: "", success: null });
    setSelectedVenue(null);
  };

  React.useEffect(() => {
    if (user && routerLocation.state?.openVenueId && catalogVenues.length) {
      const v = catalogVenues.find((item) => item.id === routerLocation.state.openVenueId);
      if (v) {
        bookVenue(v);
        navigate("/venues", { replace: true, state: {} });
      }
    }
  }, [user, routerLocation.state?.openVenueId, catalogVenues]);

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!bookingVenue) return;
    if (!user) {
      navigate("/auth/login", { state: { from: "/venues", openVenueId: bookingVenue.id } });
      return;
    }
    setBookingState({ busy: true, error: "", success: null });
    try {
      const start = parseScheduleDateTime(bookingSchedule.startDate, bookingSchedule.startTime, bookingSchedule.startPeriod);
      const end = parseScheduleDateTime(bookingSchedule.endDate, bookingSchedule.endTime, bookingSchedule.endPeriod);

      if (!start) throw new Error("Please enter a valid Start Date & Time (e.g. 10:00 AM).");
      if (!end) throw new Error("Please enter a valid End Date & Time (e.g. 06:00 PM).");
      if (end <= start) throw new Error("Reservation End Date & Time must be after the Start Date & Time.");
      if (start <= new Date()) throw new Error("Reservation date and time must be in the future.");
      if (!bookingForm.purpose.trim()) throw new Error("Please describe the occasion or purpose (e.g. Wedding Reception).");

      const result = await apiRequest("/venue-reservations", {
        method: "POST",
        body: JSON.stringify({
          venueId: bookingVenue.id,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          purpose: bookingForm.purpose.trim(),
          customerNotes: bookingForm.customerNotes?.trim() || "",
        }),
      });
      setBookingState({ busy: false, error: "", success: result.reservation });
      window.dispatchEvent(new Event("eventoria:data-changed"));
    } catch (err) {
      setBookingState({ busy: false, error: err.message || "Could not submit booking request.", success: null });
    }
  };
  return (
    <div className="vn-page">
      <Topbar active="venues" />
      <section className="vn-hero">
        <div className="vn-hero-copy">
          <p>— &nbsp; VENUES &nbsp; —</p>
          <h1 className="vn-hero-title">
            <span className="vn-title-line">Extraordinary <em>Venues</em></span>
            <span className="vn-title-line">for Your Special Occasions</span>
          </h1>
          <span>
            From luxury banquet halls to outdoor spaces, find the perfect
            <br />
            venue for weddings, parties, corporate events and more.
          </span>
        </div>
        <div className="vn-hero-image" />
      </section>
      <form
        className="vn-search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(draft);
        }}
      >
        <label>
          <Search />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search venues, location or type"
          />
        </label>
        <label className="vn-search-choice">
          <MapPin />
          <select
            aria-label="Search location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {availableLocations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </label>
        <label className="vn-search-choice">
          <Users />
          <select
            aria-label="Guest capacity"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          >
            <option value="5000">Any capacity</option>
            <option value="300">Up to 300 guests</option>
            <option value="500">Up to 500 guests</option>
            <option value="800">Up to 800 guests</option>
            <option value="1500">Up to 1,500 guests</option>
          </select>
        </label>
        <button>
          Search <ArrowRight />
        </button>
      </form>
      <div className="vn-types">
        {types.map((name, index) => (
          <button
            className={type === name ? "active" : ""}
            onClick={() => setType(name)}
            key={name}
          >
            <i>
              {index === 0 ? "⌂" : index === 5 ? "▣" : index === 6 ? "♧" : "♜"}
            </i>
            {name}
          </button>
        ))}
      </div>
      <main className="vn-main">
        <aside className="vn-filters">
          <header>
            <h2>
              <SlidersHorizontal /> Filters
            </h2>
            <button onClick={clear}>Clear All</button>
          </header>
          <section>
            <h3>
              <MapPin /> Location
            </h3>
            <select
              aria-label="Filter location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </section>
          <section>
            <h3>
              <Building2 /> Venue Type
            </h3>
            {types.slice(1).map((name) => (
              <label key={name}>
                <button
                  className={selectedTypes.includes(name) ? "checked" : ""}
                  onClick={() => toggle(name)}
                >
                  {selectedTypes.includes(name) && <Check />}
                </button>
                {name}
              </label>
            ))}
          </section>
          <section>
            <h3>Guest Capacity</h3>
            <input
              type="range"
              min="300"
              max="5000"
              step="100"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
            <div>
              <small>10</small>
              <small>{capacity.toLocaleString("en-IN")} guests</small>
            </div>
          </section>
          <section>
            <h3>Price Range (Per Day)</h3>
            <input
              type="range"
              min="5000"
              max="100000"
              step="5000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
            <div>
              <small>₹ 5,000</small>
              <small>₹ {maxPrice.toLocaleString("en-IN")}</small>
            </div>
          </section>
          <button className="vn-apply" onClick={() => setQuery(draft)}>
            Apply Filters
          </button>
        </aside>
        <section className="vn-results">
          <h2>{loading ? "Searching venues…" : `${filtered.length || 0} Venues Found`}</h2>
          {loading ? (
            <p className="state-message">Loading verified venues…</p>
          ) : (
            <>
              <div className="vn-grid">
                {shown.map((v) => (
                  <VenueCard venue={v} onView={setSelectedVenue} key={v.id || v.name} />
                ))}
              </div>
              {!filtered.length && (
                <div className="vn-empty">
                  <h3>No venues found</h3>
                  <p>Only venues added by verified venue owners appear here. Once approved, they will be listed automatically.</p>
                  <div style={{ marginTop: "16px", display: "flex", gap: "12px", justifyContent: "center" }}>
                    <a href="/list-venue" className="btn primary">List Your Venue</a>
                    <button type="button" onClick={clear} className="btn ghost">Clear filters</button>
                  </div>
                </div>
              )}
            </>
          )}
          {filtered.length > 0 && (
            <div className="vn-pages">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                aria-label="Previous venues page"
              >
                <ChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (number) =>
                  number === page ? (
                    <b key={number}>{number}</b>
                  ) : (
                    <button key={number} onClick={() => setPage(number)}>
                      {number}
                    </button>
                  ),
              )}
              <button
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={page === totalPages}
                aria-label="Next venues page"
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </section>
      </main>
      <section className="vn-trust">
        <div>
          <small>WHY CHOOSE EVENTORIA VENUES?</small>
          <h2>
            Perfect Spaces for
            <br />
            <em>Every Occasion</em>
          </h2>
          <p>
            Handpicked venues with best amenities,
            <br />
            transparent pricing and verified details.
          </p>
        </div>
        {[
          [ShieldCheck, "Verified Venues", "Authentic and trusted venues"],
          [Building2, "Wide Variety", "From budget halls to luxury resorts"],
          [Check, "Transparent Pricing", "No hidden charges"],
          [Users, "Dedicated Support", "Get help from our team anytime"],
        ].map(([Icon, a, b]) => (
          <article key={a}>
            <i>
              <Icon />
            </i>
            <b>{a}</b>
            <span>{b}</span>
          </article>
        ))}
      </section>
      <section className="vn-featured">
        <header>
          <h2>
            <em>Featured</em> Venues in Salem
          </h2>
          <a href="#venues">
            View All Venues <ArrowRight />
          </a>
        </header>
        {catalogVenues.length > 0 ? (
          <div>
            {catalogVenues.slice(0, 4).map((v) => (
              <VenueCard venue={v} onView={setSelectedVenue} key={v.id || v.name} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "32px 20px", color: "#667085" }}>
            <p>No featured venues available yet. Spaces added by verified venue owners will appear here.</p>
          </div>
        )}
      </section>
      {selectedVenue && (
        <div
          className="vn-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedVenue.name} details`}
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
            <p>
              <MapPin /> {selectedVenue.city}, Tamil Nadu
            </p>
            <p>
              <Users /> {selectedVenue.guests} guests
            </p>
            <strong>₹ {selectedVenue.price.toLocaleString("en-IN")}/hr</strong>
            <div className="guest-facts"><span><b>Available</b> selected dates</span><span><b>{selectedVenue.rating} ★</b> {selectedVenue.reviews} reviews</span></div>
            <p className="guest-description">A verified Eventoria venue with clear capacity, amenities, pricing and policies. Reserve directly with date, time, and event occasion.</p>
            <div className="guest-actions"><button onClick={() => shareVenue(selectedVenue)}><Share2/> Share</button><button onClick={() => compareVenue(selectedVenue)}><GitCompareArrows/> Compare</button><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedVenue.name}, ${selectedVenue.city}`)}`}><ExternalLink/> Map</a></div>
            <div className="guest-reviews"><b>Guest reviews</b><span>★ {selectedVenue.rating} · “Beautiful space and responsive venue team.”</span></div>
            {guestNotice && <small className="guest-notice">{guestNotice}</small>}
            <button className="vn-enquire" onClick={() => bookVenue(selectedVenue)}>
              Book This Venue <small>Select dates & reserve instantly</small><ArrowRight />
            </button>
          </article>
        </div>
      )}

      {bookingVenue && (
        <div
          className="vn-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Book ${bookingVenue.name}`}
          onClick={(e) => { if (e.target === e.currentTarget && !bookingState.busy) setBookingVenue(null); }}
        >
          <article style={{ maxWidth: 580, width: "94%", maxHeight: "90vh", overflowY: "auto" }}>
            <button
              className="vn-modal-close"
              onClick={() => { setBookingVenue(null); setBookingState({ busy: false, error: "", success: null }); }}
              aria-label="Close reservation"
              disabled={bookingState.busy}
            >
              ×
            </button>

            {bookingState.success ? (
              <div style={{ textAlign: "center", padding: "16px 8px" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#eff8ff", color: "#175cd3", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Clock size={32} />
                </div>
                <h2 style={{ fontSize: 22, margin: "0 0 8px", color: "#101828" }}>Booking Request Sent!</h2>
                <p style={{ color: "#475467", fontSize: 14, margin: "0 0 20px", lineHeight: 1.5 }}>
                  Your interest in <strong>{bookingVenue.name}</strong> has been sent to the venue owner. They will review date and time availability, then confirm your booking or reply with notes.
                </p>
                <div style={{ background: "#f8f9fc", border: "1px solid #eaecf0", borderRadius: 12, padding: "16px", textAlign: "left", marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#667085", fontSize: 13 }}>Reference ID</span>
                    <b style={{ color: "#09172e", fontFamily: "monospace", fontSize: 14 }}>{bookingState.success.reference}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#667085", fontSize: 13 }}>Occasion</span>
                    <b style={{ color: "#101828", fontSize: 13 }}>{bookingState.success.purpose}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#667085", fontSize: 13 }}>Schedule</span>
                    <b style={{ color: "#101828", fontSize: 13 }}>{new Date(bookingState.success.startsAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#667085", fontSize: 13 }}>Status</span>
                    <span style={{ color: "#b54708", fontSize: 12, fontWeight: 700, background: "#fffaeb", padding: "3px 10px", borderRadius: 99, border: "1px solid #fedf89" }}>
                      Pending Owner Confirmation
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    type="button"
                    className="btn primary"
                    style={{ flex: 1, padding: "12px" }}
                    onClick={() => navigate("/dashboard")}
                  >
                    View in My Bookings <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ padding: "12px 18px" }}
                    onClick={() => { setBookingVenue(null); setBookingState({ busy: false, error: "", success: null }); }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmReservation}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <img
                    src={bookingVenue.image}
                    alt={bookingVenue.name}
                    style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }}
                  />
                  <div>
                    <h2 style={{ fontSize: 18, margin: 0, color: "#101828" }}>Request Booking: {bookingVenue.name}</h2>
                    <span style={{ fontSize: 13, color: "#667085" }}>{bookingVenue.city} · ₹{bookingVenue.price.toLocaleString("en-IN")}/hr</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#344054", marginBottom: 6 }}>
                      Event Purpose / Occasion <em>*</em>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wedding Reception, Corporate Meeting, Birthday Celebration"
                      value={bookingForm.purpose}
                      onChange={(e) => setBookingForm(f => ({ ...f, purpose: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 14 }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
                    {/* START DATE & TIME */}
                    <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                        Start Date & Time <em>*</em>
                      </label>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 3 }}>DATE</span>
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().split("T")[0]}
                          value={bookingSchedule.startDate}
                          onChange={(e) => setBookingSchedule(s => ({ ...s, startDate: e.target.value }))}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff" }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 3 }}>TIME (Type time + select AM/PM)</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 10:00"
                            value={bookingSchedule.startTime}
                            onChange={(e) => setBookingSchedule(s => ({ ...s, startTime: e.target.value }))}
                            style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff", fontWeight: 700, color: "#0f172a" }}
                          />
                          <div style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1.5px solid #2563eb", background: "#f8fafc" }}>
                            <button
                              type="button"
                              onClick={() => setBookingSchedule(s => ({ ...s, startPeriod: "AM" }))}
                              style={{
                                padding: "7px 13px",
                                fontSize: 12,
                                fontWeight: 800,
                                border: "none",
                                cursor: "pointer",
                                background: bookingSchedule.startPeriod === "AM" ? "#2563eb" : "#ffffff",
                                color: bookingSchedule.startPeriod === "AM" ? "#ffffff" : "#475569",
                                transition: "all 0.15s ease",
                              }}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => setBookingSchedule(s => ({ ...s, startPeriod: "PM" }))}
                              style={{
                                padding: "7px 13px",
                                fontSize: 12,
                                fontWeight: 800,
                                border: "none",
                                cursor: "pointer",
                                background: bookingSchedule.startPeriod === "PM" ? "#2563eb" : "#ffffff",
                                color: bookingSchedule.startPeriod === "PM" ? "#ffffff" : "#475569",
                                transition: "all 0.15s ease",
                              }}
                            >
                              PM
                            </button>
                          </div>
                        </div>
                        <small style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "block" }}>e.g. 10:00, 9:30 or 4:00</small>
                      </div>
                    </div>

                    {/* END DATE & TIME */}
                    <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                        End Date & Time <em>*</em>
                      </label>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 3 }}>DATE</span>
                        <input
                          type="date"
                          required
                          min={bookingSchedule.startDate || new Date().toISOString().split("T")[0]}
                          value={bookingSchedule.endDate}
                          onChange={(e) => setBookingSchedule(s => ({ ...s, endDate: e.target.value }))}
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff" }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 3 }}>TIME (Type time + select AM/PM)</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 06:00"
                            value={bookingSchedule.endTime}
                            onChange={(e) => setBookingSchedule(s => ({ ...s, endTime: e.target.value }))}
                            style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, background: "#fff", fontWeight: 700, color: "#0f172a" }}
                          />
                          <div style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1.5px solid #2563eb", background: "#f8fafc" }}>
                            <button
                              type="button"
                              onClick={() => setBookingSchedule(s => ({ ...s, endPeriod: "AM" }))}
                              style={{
                                padding: "7px 13px",
                                fontSize: 12,
                                fontWeight: 800,
                                border: "none",
                                cursor: "pointer",
                                background: bookingSchedule.endPeriod === "AM" ? "#2563eb" : "#ffffff",
                                color: bookingSchedule.endPeriod === "AM" ? "#ffffff" : "#475569",
                                transition: "all 0.15s ease",
                              }}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => setBookingSchedule(s => ({ ...s, endPeriod: "PM" }))}
                              style={{
                                padding: "7px 13px",
                                fontSize: 12,
                                fontWeight: 800,
                                border: "none",
                                cursor: "pointer",
                                background: bookingSchedule.endPeriod === "PM" ? "#2563eb" : "#ffffff",
                                color: bookingSchedule.endPeriod === "PM" ? "#ffffff" : "#475569",
                                transition: "all 0.15s ease",
                              }}
                            >
                              PM
                            </button>
                          </div>
                        </div>
                        <small style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "block" }}>e.g. 06:00, 5:30 or 11:00</small>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#344054", marginBottom: 6 }}>
                      Notes / Special Requirements for Venue Owner (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Estimated 250 guests, need outside catering access and sound system."
                      value={bookingForm.customerNotes}
                      onChange={(e) => setBookingForm(f => ({ ...f, customerNotes: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d0d5dd", fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
                    />
                  </div>

                  {(() => {
                    const start = parseScheduleDateTime(bookingSchedule.startDate, bookingSchedule.startTime, bookingSchedule.startPeriod);
                    const end = parseScheduleDateTime(bookingSchedule.endDate, bookingSchedule.endTime, bookingSchedule.endPeriod);
                    const validRange = start && end && end > start;
                    const hours = validRange ? Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60))) : 0;
                    const totalCost = validRange ? hours * bookingVenue.price : 0;
                    return (
                      <div style={{ background: "#f9fafb", borderRadius: 10, padding: "14px 16px", border: "1px solid #eaecf0", marginTop: 2 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475467", marginBottom: 6 }}>
                          <span>Duration</span>
                          <b>{validRange ? `${hours} hours` : <span style={{ color: "#b54708" }}>Enter valid future dates & times</span>}</b>
                        </div>
                        {validRange && (
                          <div style={{ fontSize: 12, color: "#097948", marginBottom: 6, fontWeight: 600 }}>
                            {start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}, {bookingSchedule.startTime} {bookingSchedule.startPeriod} → {end.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}, {bookingSchedule.endTime} {bookingSchedule.endPeriod}
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475467", marginBottom: 8 }}>
                          <span>Hourly Rate</span>
                          <b>₹{bookingVenue.price.toLocaleString("en-IN")}/hr</b>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#101828", borderTop: "1px solid #e4e7ec", paddingTop: 8 }}>
                          <span>Estimated Total</span>
                          <span style={{ color: "#d61858" }}>₹{totalCost.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ background: "#f0f9ff", border: "1px solid #b9e6fe", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#026aa2", lineHeight: 1.4 }}>
                    ℹ️ <b>How it works:</b> Submitting sends your inquiry directly to the venue owner. The venue owner will check if the venue is available at this date and time, then confirm your booking or reply with notes.
                  </div>

                  {user && (
                    <div style={{ fontSize: 12, color: "#097948", background: "#f0fdf4", padding: "8px 12px", borderRadius: 8, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 6 }}>
                      <Check size={14} /> Requesting as <b>{user.name}</b> ({user.email})
                    </div>
                  )}

                  {bookingState.error && (
                    <div style={{ padding: "10px 14px", background: "#fef3f2", color: "#b42318", borderRadius: 8, fontSize: 13, border: "1px solid #fecdca" }}>
                      {bookingState.error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: "12px 16px" }}
                      onClick={() => setBookingVenue(null)}
                      disabled={bookingState.busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn primary"
                      style={{ flex: 1, padding: "12px", justifyContent: "center" }}
                      disabled={bookingState.busy}
                    >
                      {bookingState.busy ? "Sending Request…" : "Send Booking Request (Express Interest)"} <Send size={15} />
                    </button>
                  </div>
                </div>
              </form>
            )}
          </article>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
