import React from "react";
import { ArrowRight, Building2, Check, FileText, Headphones, Image, MapPin, Play, Settings, ShieldCheck, Star, Users } from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";

const formSteps = [
  ["Venue Information", "Basic details about your venue", FileText],
  ["Location", "Address and map location", MapPin],
  ["Venue Specifications", "Capacity, facilities and amenities", Building2],
  ["Photos & Videos", "Showcase your venue", Image],
  ["Pricing & Policies", "Pricing, availability and rules", Settings],
  ["Review & Submit", "Check details and publish", Check],
];
const types = ["Banquet Halls", "Convention Centers", "Resorts", "Outdoor Spaces", "Hotels", "Lawns", "Unique Venues"];

export default function ListVenuePage() {
  const [step, setStep] = React.useState(0);
  const [saved, setSaved] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", type: "", short: "", full: "" });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="org-page lv-page">
    <Topbar active="list"/>
    <section className="org-hero lv-hero">
      <div className="org-hero-copy"><p className="org-kicker">— &nbsp; LIST YOUR VENUE &nbsp; —</p><h1>Turn Your Space into<br/>Unforgettable <em>Events</em></h1><p className="org-intro">List your venue on Eventoria and connect with thousands of event organizers looking for the perfect space. Showcase your venue, get more bookings, and grow your business with zero hassle.</p>
        <div className="org-benefits"><span><Users/><b>Reach<br/>More Customers</b></span><span><ShieldCheck/><b>Get Verified<br/>Listing</b></span><span><Settings/><b>Flexible<br/>Pricing</b></span><span><Headphones/><b>Dedicated<br/>Partner Support</b></span></div>
        <div className="org-hero-actions"><button onClick={() => document.querySelector('.lv-builder')?.scrollIntoView({behavior:'smooth'})}>List Your Venue <ArrowRight/></button><button className="org-watch"><i><Play fill="currentColor"/></i><b>Watch<br/>How It Works</b></button></div>
      </div><div className="org-hero-image"><div><span>Weddings</span><span>Corporate Events</span><span>Birthday Parties</span><span>Social Gatherings</span><span>Conferences</span><span>Exhibitions</span></div></div>
    </section>
    <section className="org-quick"><p className="org-kicker">GET STARTED IN MINUTES</p><h2>List Your Venue in <em>4 Simple Steps</em></h2><div>{[["Add Venue Details","Basic information about your venue",FileText],["Upload Photos","Showcase your space with images",Image],["Set Pricing & Amenities","Add amenities, pricing and policies",Settings],["Submit for Verification","Our team will verify your venue",ShieldCheck]].map(([title,text,Icon],index)=><React.Fragment key={title}><article><b>{index+1}</b><i><Icon/></i><h3>{title}</h3><p>{text}</p></article>{index<3&&<ArrowRight className="org-step-arrow"/>}</React.Fragment>)}</div></section>
    <section className="org-builder lv-builder"><aside>{formSteps.map(([title,text,Icon],index)=><button className={step===index?'active':''} onClick={()=>setStep(index)} key={title}><b>{index+1}</b><span><strong>{title}</strong><small>{text}</small></span><Icon/></button>)}</aside><form onSubmit={(event)=>{event.preventDefault();setSaved(true)}}><h2>{formSteps[step][0]}</h2><p>Tell us about your venue. This information will be visible to event organizers.</p>
      {step===0?<><div className="org-form-grid"><label>Venue Name <em>*</em><input value={form.name} onChange={update('name')} placeholder="Enter venue name" required/></label><label>Venue Type <em>*</em><select value={form.type} onChange={update('type')} required><option value="">Select venue type</option>{types.map(type=><option key={type}>{type}</option>)}</select></label></div><label>Short Description <em>*</em><textarea value={form.short} maxLength="200" onChange={update('short')} placeholder="Write a short description about your venue..." required/><small>{form.short.length}/200</small></label><label>Full Description <em>*</em><textarea className="lv-full" value={form.full} maxLength="1000" onChange={update('full')} placeholder="Describe your venue, unique features, nearby attractions, and why it's perfect for events..." required/><small>{form.full.length}/1000</small></label></>:<div className="org-step-placeholder">{React.createElement(formSteps[step][2])}<h3>{formSteps[step][0]}</h3><p>Add the required venue information, then continue to the next step.</p></div>}
      <div className="org-form-actions"><button type="button" className="draft" onClick={()=>setSaved(true)}>Save as Draft</button><button type={step===5?'submit':'button'} onClick={()=>step<5&&setStep(step+1)}>{step===5?'Submit Venue':'Next Step'} <ArrowRight/></button></div>{saved&&<div className="org-saved"><Check/> Your venue draft has been saved.</div>}</form></section>
    <section className="org-categories lv-types"><div><p className="org-kicker">VENUE TYPES</p><h2>List <em>Any Type</em><br/>of Venue</h2><p>From elegant banquet halls to scenic outdoor spaces, Eventoria welcomes all types of venues.</p></div><div>{types.map((type,index)=><button key={type}><i>{["♜","▥","♨","♣","▧","♒","★"][index]}</i><b>{type}</b></button>)}</div></section>
    <section className="org-why"><div><p className="org-kicker">WHY LIST WITH EVENTORIA?</p><h2>Grow Your<br/>Venue <em>Business</em></h2><p>Join thousands of venue owners who trust Eventoria to bring more events and revenue.</p></div>{[[Users,"High Visibility","Reach thousands of event organizers"],[FileText,"Verified Listings","Build trust and get more bookings"],[Settings,"Easy Management","Manage availability, pricing and bookings"],[Headphones,"Dedicated Support","Our team is here to help you"]].map(([Icon,title,text])=><article key={title}><i><Icon/></i><b>{title}</b><span>{text}</span></article>)}</section>
    <section className="lv-featured"><header><div><p className="org-kicker">FEATURED VENUES ON EVENTORIA</p><h2>Spaces That Inspire <em>Great Events</em></h2></div><a href="/venues">View All Venues <ArrowRight/></a></header><div>{[["The Grand Palace","Salem","4.8","https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=85"],["Royal Orchid Resort","Yercaud","4.7","https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=700&q=85"],["Skyline Convention","Salem","4.6","https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=700&q=85"],["Green Valley Lawns","Salem","4.6","https://images.unsplash.com/photo-1507501336603-6e31db2be093?auto=format&fit=crop&w=700&q=85"]].map(([name,city,rating,image])=><article key={name}><img src={image} alt={name}/><h3>{name}</h3><b><Star fill="currentColor"/> {rating}</b><p><MapPin/> {city}, Tamil Nadu</p><button aria-label={`View ${name}`}><ArrowRight/></button></article>)}</div></section>
    <section className="org-cta"><div/><section><p className="org-kicker">READY TO LIST YOUR VENUE?</p><h2>Start Getting <em>Bookings</em> Today</h2><span>Join Eventoria and turn your venue into a hub for amazing events.</span><button onClick={()=>document.querySelector('.lv-builder')?.scrollIntoView({behavior:'smooth'})}>List Your Venue <ArrowRight/></button></section></section>
    <SiteFooter/>
  </div>
}
