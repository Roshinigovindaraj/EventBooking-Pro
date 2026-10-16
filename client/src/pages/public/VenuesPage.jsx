import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Search,
  Share2,
  GitCompareArrows,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trees,
  Users,
} from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import { apiRequest } from "../../services/apiClient.js";

const venueImages = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1507501336603-6e31db2be093?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=85",
];

const venues = [
  [
    "The Grand Palace",
    "Banquet Halls",
    "Salem",
    "500 - 1,000",
    25000,
    "4.8",
    "320",
  ],
  [
    "Skyline Convention",
    "Convention Centers",
    "Salem",
    "200 - 800",
    40000,
    "4.6",
    "210",
  ],
  [
    "Royal Orchid Resort",
    "Resorts",
    "Yercaud",
    "100 - 500",
    60000,
    "4.7",
    "188",
  ],
  [
    "The Lotus Banquet",
    "Banquet Halls",
    "Salem",
    "300 - 700",
    35000,
    "4.5",
    "178",
  ],
  ["Green Valley Lawns", "Lawns", "Salem", "500 - 1,500", 30000, "4.4", "132"],
  [
    "Heritage Hills Resort",
    "Resorts",
    "Yercaud",
    "50 - 300",
    45000,
    "4.6",
    "165",
  ],
].map((item, index) => ({
  name: item[0],
  type: item[1],
  city: item[2],
  guests: item[3],
  capacity: Number(
    item[3]
      .split("-")
      .pop()
      .replace(/[^0-9]/g, ""),
  ),
  price: item[4],
  rating: item[5],
  reviews: item[6],
  image: venueImages[index],
}));
export { venues as venueData };
const publicVenue = (venue, index) => ({ name: venue.name, id: venue._id, type: venue.type, city: venue.location?.city || "", guests: `Up to ${Number(venue.capacity).toLocaleString("en-IN")}`, capacity: venue.capacity, price: Math.round(venue.priceMinorPerHour / 100), rating: "New", reviews: "0", image: venue.images?.[0] || venueImages[index % venueImages.length] });

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
  const storageKey = `eventoria:wishlist:${owner}:venue:${venue.name}`;
  const [liked, setLiked] = React.useState(() => localStorage.getItem(storageKey) === "1");
  React.useEffect(() => setLiked(localStorage.getItem(storageKey) === "1"), [storageKey]);
  const toggleLiked = () => setLiked((current) => { const next = !current; localStorage.setItem(storageKey, next ? "1" : "0"); return next; });
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
  const { user } = useAuth();
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
  const [catalogVenues, setCatalogVenues] = React.useState(venues);
  React.useEffect(() => { let active = true; const load = () => apiRequest('/venues').then((result) => { if (active && result.items?.length) setCatalogVenues(result.items.map(publicVenue)); }).catch(() => null); load(); window.addEventListener('eventoria:data-changed', load); window.addEventListener('focus', load); return () => { active = false; window.removeEventListener('eventoria:data-changed', load); window.removeEventListener('focus', load); }; }, []);
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
  const shareVenue = async (venue) => {
    const data = { title: venue.name, text: `View ${venue.name} on Eventoria`, url: window.location.href };
    if (navigator.share) await navigator.share(data).catch(() => null);
    else { await navigator.clipboard?.writeText(window.location.href); setGuestNotice("Venue link copied."); }
  };
  const compareVenue = (venue) => {
    const current = JSON.parse(localStorage.getItem("eventoria:compare:venues") || "[]");
    const next = [...current.filter((name) => name !== venue.name), venue.name].slice(-3);
    localStorage.setItem("eventoria:compare:venues", JSON.stringify(next));
    setGuestNotice(`Added to compare (${next.length}/3).`);
  };
  const bookVenue = (venue) => user ? navigate("/dashboard") : navigate("/auth/login", { state: { from: "/venues", booking: venue.name } });
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
            <option>All locations</option>
            <option>Salem</option>
            <option>Yercaud</option>
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
              <option>All locations</option>
              <option>Salem</option>
              <option>Yercaud</option>
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
          <h2>{filtered.length || 0} Venues Found</h2>
          <div className="vn-grid">
            {shown.map((v) => (
              <VenueCard venue={v} onView={setSelectedVenue} key={v.name} />
            ))}
          </div>
          {!filtered.length && (
            <div className="vn-empty">
              No venues match your search.{" "}
              <button onClick={clear}>Clear filters</button>
            </div>
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
        <div>
          {venues.slice(0, 4).map((v) => (
            <VenueCard venue={v} onView={setSelectedVenue} key={v.name} />
          ))}
        </div>
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
            <strong>₹ {selectedVenue.price.toLocaleString("en-IN")}/day</strong>
            <div className="guest-facts"><span><b>Available</b> selected dates</span><span><b>{selectedVenue.rating} ★</b> {selectedVenue.reviews} reviews</span></div>
            <p className="guest-description">A verified Eventoria venue with clear capacity, amenities, pricing and policies. Contact details become available during booking.</p>
            <div className="guest-actions"><button onClick={() => shareVenue(selectedVenue)}><Share2/> Share</button><button onClick={() => compareVenue(selectedVenue)}><GitCompareArrows/> Compare</button><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedVenue.name}, ${selectedVenue.city}`)}`}><ExternalLink/> Map</a></div>
            <div className="guest-reviews"><b>Guest reviews</b><span>★ {selectedVenue.rating} · “Beautiful space and responsive venue team.”</span></div>
            {guestNotice && <small className="guest-notice">{guestNotice}</small>}
            <button className="vn-enquire" onClick={() => bookVenue(selectedVenue)}>
              Book Now <small>{user ? "Continue to booking" : "Login required"}</small><ArrowRight />
            </button>
          </article>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
