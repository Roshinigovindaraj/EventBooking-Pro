import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarDays, Heart, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Headphones, Tag, Sparkles, Mail, Menu, X, Star, Ticket, Building2, Smartphone, Music2, PartyPopper, Gem, BriefcaseBusiness, Trophy, TentTree, Mic2, Store, Play, Users, Gift, House } from 'lucide-react';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthPage from './pages/auth/AuthPage.jsx';
import CatalogPage, { Topbar, eventData } from './pages/public/CatalogPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import VenuesPage, { venueData } from './pages/public/VenuesPage.jsx';
import OrganizePage from './pages/public/OrganizePage.jsx';
import ListVenuePage from './pages/public/ListVenuePage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import RolePortalPage from './pages/RolePortalPage.jsx';
import TicketScannerPage from './pages/TicketScannerPage.jsx';
import { eventCategories } from './data/eventCategories.js';
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

const heroSlides = Array.from({length:7},(_,i)=>`/images/hero${i}.png`);
const heroCopy = [
  {kicker:'CELEBRATE LOVE',kickerAccent:'BEAUTIFULLY',lines:[['Your Dream ','Wedding'],['Starts Right ','Here']],description:'Discover breathtaking venues and thoughtful details for a celebration that feels entirely yours.'},
  {kicker:'FEEL THE MUSIC',kickerAccent:'LIVE',lines:[['Unforgettable ','Concerts'],['Magical ','Nights']],description:'Find live performances, vibrant stages and unforgettable nights in spectacular destinations.'},
  {kicker:'LEARN • CREATE',kickerAccent:'GROW',lines:[['Ideas Become ','Skills'],['At Inspiring ','Workshops']],description:'Join expert-led workshops designed to spark creativity, collaboration and meaningful growth.'},
  {kicker:'CONNECT • DISCOVER',kickerAccent:'SUCCEED',lines:[['Where Great ','Ideas'],['Meet New ','Opportunities']],description:'Explore exhibitions and professional events where innovators, brands and communities connect.'},
  {kicker:'DANCE • LAUGH',kickerAccent:'CELEBRATE',lines:[['Turn Every ','Party'],['Into A ','Memory']],description:'Book vibrant venues and experiences made for music, laughter and celebrations after sunset.'},
  {kicker:'CHEER • PLAY',kickerAccent:'BELONG',lines:[['Experience Live ','Sports'],['Feel Every ','Moment']],description:'Discover thrilling matches, fan festivals and sporting experiences that bring everyone together.'},
  {kicker:'HONOUR TRADITION',kickerAccent:'WITH JOY',lines:[['Celebrate Your ','Culture'],['Create Lasting ',null],['','Memories']],description:'Find beautiful spaces for cultural festivities, family traditions and joyful community gatherings.'}
];

const categories = eventCategories.map(({name,image})=>[name,image]);

const featuredEvents = eventData.slice(0, 4);
const featuredVenues = venueData.slice(0, 4);

function Logo({light=false}) { return <a className={`logo ${light?'light':''}`} href="#"><span className="logo-mark">✦</span><span><b>Eventoria</b><small>Events • Venues • Every Moment</small></span></a> }

function Header(){
  const [open,setOpen]=React.useState(false);
  const links=[['Home',House,'#home'],['Events',CalendarDays,'/discover'],['Venues',MapPin,'#venues'],['Organize Event',Users,'#organize-event'],['List Your Venue',Store,'#list-your-venue']];
  return <header className="header wrap"><Logo/><nav className={open?'open':''}>{links.map(([n,I,to],i)=>to.startsWith('/')?<Link className={i===0?'active':''} to={to} onClick={()=>setOpen(false)} key={n}><I aria-hidden="true"/><span>{n}</span></Link>:<a className={i===0?'active':''} href={to} onClick={()=>setOpen(false)} key={n}><I aria-hidden="true"/><span>{n}</span></a>)}</nav><div className="header-actions"><Link className="btn ghost" to="/auth/login">Login</Link><Link className="btn primary" to="/auth/register">Sign Up <ArrowRight/></Link><button className="menu" onClick={()=>setOpen(!open)} aria-label="Menu">{open?<X/>:<Menu/>}</button></div></header>
}

function Hero(){
  const [activeSlide,setActiveSlide]=React.useState(0);
  React.useEffect(()=>{
    const timer=window.setInterval(()=>setActiveSlide(current=>(current+1)%heroSlides.length),5000);
    return ()=>window.clearInterval(timer);
  },[]);
  const copy=heroCopy[activeSlide];
  return <section className={`hero hero-skin-${activeSlide}`} id="home"><Topbar home/><div className="hero-art" aria-hidden="true">{heroSlides.map((src,i)=><div className={`hero-slide ${i===activeSlide?'active':''}`} style={{backgroundImage:`url(${src})`}} key={src}/>)}</div><div className="hero-content wrap"><div className={`hero-copy hero-theme-${activeSlide}`} key={activeSlide}><p className="eyebrow">{copy.kicker} <span>{copy.kickerAccent}</span></p><h1>{copy.lines.map(([text,accent],i)=><React.Fragment key={`${text}-${accent}`}><span className="hero-copy-line">{text}{accent&&<em className={`hero-keyword keyword-${i+1}`}>{accent}</em>}</span>{i<copy.lines.length-1&&<br/>}</React.Fragment>)}</h1><p className="lead">{copy.description}</p></div></div><div className="story"><button><Play fill="currentColor"/></button><span>Watch<br/>Our Story</span></div><SearchPanel/></section>
}

function SearchPanel(){const [tab,setTab]=React.useState('Events'); const navigate=useNavigate(); const submit=e=>{e.preventDefault();const data=new FormData(e.currentTarget);const params=new URLSearchParams({type:tab.toLowerCase()});for(const [key,value] of data)if(value)params.set(key,value);navigate(`/discover?${params}`)}; return <div className="search-wrap wrap"><div className="tabs"><button className={tab==='Events'?'active':''} onClick={()=>setTab('Events')}>Events</button><button className={tab==='Venues'?'active':''} onClick={()=>setTab('Venues')}>Venues</button></div><form className="search-panel" onSubmit={submit}><label><Search/><input name="q" placeholder={tab==='Events'?'Try “Music events in Salem”':'Search venues by name or type...'}/></label><label><MapPin/><input name="location" placeholder="Select Location"/></label><label><CalendarDays/><input name="date" type="date" aria-label="Select Date"/></label><button aria-label="Submit search"><Search/></button></form><div className="popular"><b>Popular Searches:</b>{['Music','Cricket','Workshops','Networking','Kids events','Food festivals','Cultural programs'].map(x=><button type="button" key={x} onClick={()=>navigate(`/discover?type=${tab.toLowerCase()}&q=${encodeURIComponent(x)}`)}>{x}</button>)}</div></div>}

function Categories(){return <section className="categories wrap" aria-label="Event categories"><div className="categories-track">{[...categories,...categories].map(([name,image],i)=>{const duplicate=i>=categories.length;return <Link to={`/discover?type=events&category=${encodeURIComponent(name)}`} key={`${name}-${i}`} aria-hidden={duplicate||undefined} tabIndex={duplicate?-1:undefined}><span className="category-sparkles" aria-hidden="true"><small>✦</small><small>✦</small></span><i className={`cat c${i%categories.length}`}><img src={image} alt={duplicate?'':name}/></i><b>{name}</b></Link>})}</div></section>}

function CategoryDirectory(){const navigate=useNavigate();return <section className="category-directory wrap" aria-labelledby="category-directory-title"><div className="category-directory-heading"><p className="eyebrow">EXPLORE YOUR INTERESTS</p><h2 id="category-directory-title">Browse Events by Category</h2><p>Search by event name, category, location, organizer, or venue.</p></div><div className="category-groups">{eventCategories.map(group=><article key={group.name}><div className="category-group-title"><img src={group.image} alt=""/><h3>{group.name}</h3></div><div className="subcategory-list">{group.subcategories.map(item=><button key={item} onClick={()=>navigate(`/discover?type=events&category=${encodeURIComponent(group.name)}&subcategory=${encodeURIComponent(item)}`)}>{item}</button>)}</div></article>)}</div><button className="category-example" onClick={()=>navigate('/discover?type=events&q=Music%20events%20in%20Salem')}><Search/> Try: “Music events in Salem” <ArrowRight/></button></section>}

function SectionTitle({kicker,title,accent,desc}){return <div className="section-heading"><div><p className="eyebrow">{kicker}</p><h2>{title} <em>{accent}</em></h2>{desc&&<p>{desc}</p>}</div><a href="#">View All {kicker.includes('VENUE')?'Venues':'Events'} <ArrowRight/></a></div>}
function CarouselButtons(){return <div className="carousel-buttons"><button aria-label="Previous"><ChevronLeft/></button><button aria-label="Next"><ChevronRight/></button></div>}

function EventCard({e}){const navigate=useNavigate();const book=()=>navigate(`/booking/${e.id}`,{state:{event:e}});return <article className="card"><div className="card-image"><img src={e.image} alt={e.title}/><button className="heart" aria-label={`Save ${e.title}`}><Heart/></button><div className="date"><b>{e.day}</b><span>{e.month}</span></div></div><div className="card-body"><span className={`pill ${e.type.toLowerCase()}`}>{e.type}</span><h3>{e.title}</h3><p><MapPin/> {e.city}</p><p><Store/> {e.venue}</p><div className="price">From <b>{e.price}</b><button onClick={book} aria-label={`Book ${e.title}`}><ArrowRight/></button></div></div></article>}
function VenueCard({v}){const navigate=useNavigate();return <article className="card"><div className="card-image venue"><img src={v.image} alt={v.name}/><button className="heart" aria-label={`Save ${v.name}`}><Heart/></button></div><div className="card-body"><h3>{v.name}</h3><div className="rating"><Star fill="#ff9e34"/> {v.rating} <small>({v.reviews} reviews)</small></div><p><Store/> {v.type} <span>•</span> {v.city}</p><p><ShieldCheck/> {v.guests} Guests</p><div className="price">From <b>₹{v.price.toLocaleString('en-IN')}/day</b><button onClick={()=>navigate('/venues')} aria-label={`View ${v.name}`}><ArrowRight/></button></div></div></article>}

function Listings(){return <main className="discovery"><section className="listing wrap" id="events"><SectionTitle kicker="FEATURED EVENTS" title="Trending" accent="Events" desc="Happening Near You"/><div className="title-sub">Explore the most exciting events and book your tickets before they’re gone!</div><CarouselButtons/><div className="cards">{featuredEvents.map(e=><EventCard e={e} key={e.id}/>)}</div></section><section className="listing wrap" id="venues"><SectionTitle kicker="POPULAR VENUES" title="Extraordinary" accent="Venues" desc="for Your Special Occasions"/><div className="title-sub">From luxury banquet halls to outdoor spaces, find the perfect venue for weddings, parties, corporate events and more.</div><CarouselButtons/><div className="cards">{featuredVenues.map(v=><VenueCard v={v} key={v.name}/>)}</div></section></main>}

const benefits=[['Wide Variety','Thousands of events and venues',Sparkles],['Best Prices','Exclusive deals and offers',Tag],['Secure Booking','Safe & reliable payments',ShieldCheck],['24/7 Support','Always here to help you',Headphones]];
function Why(){return <section className="why"><div className="wrap why-grid"><div className="why-copy"><p className="eyebrow">WHY EVENTORIA?</p><h2>More Than Just Events & Venues</h2><p>A complete platform for event discovery, venue booking, and seamless event management.</p><div className="benefits">{benefits.map(([a,b,I])=><div key={a}><i><I/></i><b>{a}</b><span>{b}</span></div>)}</div></div><div className="why-image" style={{backgroundImage:`url(${img.why})`}}><p>Good<br/>Celebrations<br/><em>Never end!</em></p></div></div></section>}

function Wedding(){return <section className="wedding wrap"><div className="wedding-copy"><p className="eyebrow">WEDDING SPECIAL</p><h2>Your Dream<br/><em>Wedding Starts Here</em></h2><p>Beautiful venues, trusted vendors and everything you need to make your big day perfect.</p><button className="btn wedding-btn">Explore Wedding Venues <ArrowRight/></button><div className="wedding-features"><span><Building2/><b>Stunning Venues</b></span><span><Users/><b>Trusted Vendors</b></span><span><Gift/><b>Customized Packages</b></span></div></div><div className="wedding-visual" style={{backgroundImage:`url(${img.wedding})`}}/></section>}

function Phone({second=false}){return <div className={`phone ${second?'second':''}`}><div className="notch"/><div className="phone-logo"><Logo/></div><div className="phone-search"><Search/> Search events...</div><div className="phone-cats"><span>🎵</span><span>💍</span><span>🎉</span><span>⚽</span></div><img src={second?img.venue3:img.event1} alt="Eventoria app preview"/><b>{second?'Royal Orchids Resort':'Arijit Singh Live'}</b><small>{second?'Goa • Resort':'Chennai • Concert'}</small></div>}
function AppPromo(){const points=[[Sparkles,'Discover Events','Near You'],[CalendarDays,'Book Venues','For Any Occasion'],[Ticket,'Manage Bookings','Easily'],[Smartphone,'Digital Tickets','With QR Code'],[MapPin,'Exclusive Offers','& Discounts']]; return <section className="app-promo"><div className="wrap app-grid"><div><p className="eyebrow">ON THE GO</p><h2>Events & Venues<br/><em>in Your Pocket</em></h2><p>Download our app and get instant access to the best events, venues and exclusive offers.</p><div className="stores"><button> <span><small>Download on the</small>App Store</span></button><button>▶ <span><small>GET IT ON</small>Google Play</span></button></div></div><div className="phones"><Phone/><Phone second/></div><div className="app-points">{points.map(([I,a,b])=><div key={a}><i><I/></i><span><b>{a}</b><small>{b}</small></span></div>)}</div></div></section>}

const testimonials=[['Priya','“Amazing platform! Found the perfect venue for my wedding. The booking process was so easy.”','/images/testimonial-priya.png'],['Rajesh Kumar','“Booked concert tickets in minutes. Great experience and excellent support!”','/images/testimonial-rahul.png'],['Sneha','“The best place to find unique events and venues. Highly recommended!”','/images/testimonial-sneha.png']];
function Testimonials(){return <section className="testimonials wrap"><p className="eyebrow">TESTIMONIALS</p><h2>What Our Users Say</h2><CarouselButtons/><div className="quotes">{testimonials.map(([n,q,photo])=><article key={n}><img className="avatar" src={photo} alt={n}/><div><b>{n}</b><div className="stars" aria-label="5 out of 5 stars">{[0,1,2,3,4].map(i=><span aria-hidden="true" key={i}>★</span>)}</div><p>{q}</p></div></article>)}</div></section>}

function CTA(){return <><section className="dual-cta wrap"><article className="organizer"><img className="cta-photo" src={img.why} alt="Live event stage and audience"/><div className="cta-shade"/><i><Ticket/></i><div className="cta-content"><h3>Are You an Event Organizer?</h3><p>Reach more people, sell tickets online and manage your events with ease.</p><button className="btn white">Create an Event <ArrowRight/></button></div></article><article className="venue-cta"><img className="cta-photo" src={img.venue1} alt="Elegant event venue"/><div className="cta-shade"/><i><Building2/></i><div className="cta-content"><h3>List Your Venue</h3><p>Showcase your venue to thousands of event planners and customers.</p><button className="btn dark">List Your Venue <ArrowRight/></button></div></article></section><section className="newsletter wrap"><i><Mail/></i><div><small>Stay Updated</small><h3>Get the Latest Events & Offers</h3><p>Subscribe to our newsletter and never miss an amazing event or deal.</p></div><form onSubmit={e=>e.preventDefault()}><input type="email" aria-label="Email" placeholder="Enter your email address"/><button>Subscribe <ArrowRight/></button></form></section></>}

function Footer(){return <SiteFooter/>}

function HomePage(){return <><Hero/><Categories/><Listings/><Why/><Wedding/><Testimonials/><CTA/><Footer/></>}

function ScrollToTop(){const {pathname}=useLocation();React.useLayoutEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'})},[pathname]);return null}

export function App(){return <Routes><Route path="/" element={<HomePage/>}/><Route path="/discover" element={<CatalogPage/>}/><Route path="/venues" element={<VenuesPage/>}/><Route path="/organize" element={<OrganizePage/>}/><Route path="/list-venue" element={<ListVenuePage/>}/><Route path="/auth/:mode" element={<AuthPage/>}/><Route path="/booking/:eventId" element={<BookingPage/>}/><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/portal/:portal" element={<RolePortalPage/>}/><Route path="/scanner" element={<TicketScannerPage/>}/><Route path="*" element={<main className="state-message"><h1>Page not found</h1><Link to="/">Return home</Link></main>}/></Routes>}

const rootElement=document.getElementById('root');
if(rootElement) createRoot(rootElement).render(<BrowserRouter><ScrollToTop/><AuthProvider><App/></AuthProvider></BrowserRouter>);
