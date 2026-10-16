import React from "react";
import { ArrowRight, BarChart3, CalendarDays, Check, FileText, Headphones, Image, MapPin, Megaphone, Play, Settings, ShieldCheck, Ticket, Users } from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import { apiRequest } from "../../services/apiClient.js";

const steps = [
  ["Event Details", "Basic information", FileText],
  ["Venue & Date", "Location and schedule", MapPin],
  ["Tickets & Pricing", "Ticket types and pricing", Ticket],
  ["Media & Description", "Images and event details", Image],
  ["Review & Publish", "Check and go live", Check],
];

const quickSteps = [
  ["Provide Event Details", "Add basic information about your event", FileText],
  ["Set Venue & Date", "Choose venue, date, time and ticket types", Image],
  ["Manage & Customize", "Add description, images and event settings", Settings],
  ["Publish & Promote", "Go live and reach your audience", Megaphone],
];

const categoryOptions = {
  Entertainment: ["Concert", "Music", "DJ", "Stand-up comedy", "Theatre", "Dance", "Celebrity events"],
  Sports: ["Cricket", "Football", "Kabaddi", "Badminton", "Marathon", "Fitness", "Tournaments"],
  Education: ["Workshops", "Seminars", "Training", "Conferences", "Hackathons", "Career events"],
  Business: ["Networking", "Business meetups", "Corporate events", "Exhibitions", "Trade shows"],
  "Family & Kids": ["Kids events", "Magic shows", "Puppet shows", "Art workshops", "Camps"],
  "Food & Lifestyle": ["Food festivals", "Flea markets", "Food tasting", "Cooking workshops", "Lifestyle exhibitions"],
  Cultural: ["Temple festivals", "Cultural programs", "Traditional events", "Local festivals"],
  Parties: ["DJ nights", "Theme parties", "New Year parties", "Birthday events", "Private parties"],
};
const categories = Object.keys(categoryOptions);

export default function OrganizePage() {
  const [step, setStep] = React.useState(0);
  const [notice, setNotice] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", category: "", subcategory: "", description: "", type: "in-person", venueName: "", city: "", address: "", startsAt: "", endsAt: "", ticketName: "General Admission", price: "499", capacity: "100", image: "" });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const saveEvent = async (submit) => {
    setSaving(true); setNotice("");
    try {
      const payload = { title: form.title, description: form.description, category: form.category, subcategory: form.subcategory, venueName: form.venueName, city: form.city, address: form.address, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), images: form.image ? [form.image] : [], ticketTypes: [{ name: form.ticketName, priceMinor: Math.round(Number(form.price) * 100), currency: "INR", capacity: Number(form.capacity), minPerOrder: 1, maxPerOrder: 10 }] };
      const result = await apiRequest("/organizer/events", { method: "POST", body: JSON.stringify(payload) });
      if (submit) await apiRequest(`/organizer/events/${result.event._id}/submit`, { method: "POST" });
      setNotice(submit ? "Event submitted for admin approval. It will appear to customers after approval." : "Event draft saved in your organizer workspace.");
      window.dispatchEvent(new Event("eventoria:data-changed"));
    } catch (error) { setNotice(error.status === 401 || error.status === 403 ? "Sign in with an Event Organizer account to save this event." : error.message); }
    finally { setSaving(false); }
  };

  return <div className="org-page">
    <Topbar active="organize" />
    <section className="org-hero">
      <div className="org-hero-copy">
        <p className="org-kicker">— &nbsp; ORGANIZE EVENT &nbsp; —</p>
        <h1>Bring Your Event<br/>to Life with <em>Eventoria</em></h1>
        <p className="org-intro">Create, manage and promote your events to reach the right audience. From intimate gatherings to large-scale festivals — we help you make it happen.</p>
        <div className="org-benefits">
          <span><Users/><b>Reach<br/>More People</b></span><span><BarChart3/><b>Easy Event<br/>Management</b></span><span><ShieldCheck/><b>Secure<br/>Ticketing</b></span><span><Megaphone/><b>Powerful<br/>Promotion Tools</b></span>
        </div>
        <div className="org-hero-actions"><button onClick={() => document.querySelector(".org-builder")?.scrollIntoView({behavior:"smooth"})}>Create Your Event <ArrowRight/></button><button className="org-watch"><i><Play fill="currentColor"/></i><b>Watch<br/>How It Works</b></button></div>
      </div>
      <div className="org-hero-image"><div><span>Plan</span><span>Promote</span><span>Sell Tickets</span><span>Manage</span><span>Create Memories</span></div></div>
    </section>

    <section className="org-quick">
      <p className="org-kicker">GET STARTED IN MINUTES</p><h2>Create Your Event in <em>4 Simple Steps</em></h2>
      <div>{quickSteps.map(([title, text, Icon], index) => <React.Fragment key={title}><article><b>{index + 1}</b><i><Icon/></i><h3>{title}</h3><p>{text}</p></article>{index < 3 && <ArrowRight className="org-step-arrow"/>}</React.Fragment>)}</div>
    </section>

    <section className="org-builder">
      <aside>{steps.map(([title, text, Icon], index) => <button className={step === index ? "active" : ""} onClick={() => setStep(index)} key={title}><b>{index + 1}</b><span><strong>{title}</strong><small>{text}</small></span><Icon/></button>)}</aside>
      <form onSubmit={(event) => { event.preventDefault(); saveEvent(true); }}>
        <h2>{steps[step][0]}</h2><p>This information will be visible to your audience.</p>
        {step === 0 ? <>
          <div className="org-form-grid"><label>Event Title <em>*</em><input value={form.title} onChange={update("title")} placeholder="Enter event title" required/></label><label>Event Category <em>*</em><select value={form.category} onChange={(event) => setForm(current => ({ ...current, category: event.target.value, subcategory: "" }))} required><option value="">Select category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label>Subcategory <em>*</em><select value={form.subcategory} onChange={update("subcategory")} required><option value="">Select subcategory</option>{(categoryOptions[form.category] || []).map(value => <option key={value}>{value}</option>)}</select></label></div>
          <label>Short Description <em>*</em><textarea maxLength="200" value={form.description} onChange={update("description")} placeholder="Write a short description about your event..." required/><small>{form.description.length}/200</small></label>
          <fieldset><legend>Event Type <em>*</em></legend>{[["online","Online Event"],["in-person","In-Person Event"],["hybrid","Hybrid Event"]].map(([value,label]) => <label key={value}><input type="radio" name="eventType" value={value} checked={form.type === value} onChange={update("type")}/><span/>{label}</label>)}</fieldset>
        </> : step === 1 ? <div className="org-form-grid"><label>Venue Name <em>*</em><input value={form.venueName} onChange={update("venueName")} required/></label><label>City <em>*</em><input value={form.city} onChange={update("city")} required/></label><label>Address<input value={form.address} onChange={update("address")}/></label><label>Starts At <em>*</em><input type="datetime-local" value={form.startsAt} onChange={update("startsAt")} required/></label><label>Ends At <em>*</em><input type="datetime-local" value={form.endsAt} onChange={update("endsAt")} required/></label></div> : step === 2 ? <div className="org-form-grid"><label>Ticket Name <em>*</em><input value={form.ticketName} onChange={update("ticketName")} required/></label><label>Price (INR) <em>*</em><input type="number" min="0" value={form.price} onChange={update("price")} required/></label><label>Capacity <em>*</em><input type="number" min="1" value={form.capacity} onChange={update("capacity")} required/></label></div> : step === 3 ? <label>Event Image URL<input type="url" value={form.image} onChange={update("image")} placeholder="https://..."/></label> : <div className="org-step-placeholder"><Check/><h3>Ready for approval</h3><p>Submitting sends this event to the Admin workspace. Customers see it only after approval.</p></div>}
        <div className="org-form-actions"><button type="button" className="draft" disabled={saving} onClick={() => saveEvent(false)}>Save as Draft</button><button disabled={saving} type={step === 4 ? "submit" : "button"} onClick={() => step < 4 && setStep(step + 1)}>{saving ? "Saving..." : step === 4 ? "Submit Event" : "Next Step"} <ArrowRight/></button></div>
        {notice && <div className="org-saved"><Check/> {notice}</div>}
      </form>
    </section>

    <section className="org-categories"><div><p className="org-kicker">EVENT CATEGORIES</p><h2>Organize <em>Any Type</em><br/>of Event</h2><p>From personal celebrations to professional conferences, Eventoria supports all kinds of events.</p></div><div>{categories.map((category, index) => <button key={category}><i>{["♫","◉","♬","▣","⚽","△","♩","▥"][index]}</i><b>{category}</b></button>)}</div></section>
    <section className="org-why"><div><p className="org-kicker">WHY ORGANIZE WITH EVENTORIA?</p><h2>More Than Just<br/><em>Event Management</em></h2><p>We provide all the tools you need to create, promote and manage successful events.</p></div>{[[Users,"Wide Reach","Get discovered by thousands of event-goers"],[Ticket,"Flexible Ticketing","Multiple ticket types and pricing options"],[BarChart3,"Real-time Analytics","Track ticket sales and audience insights"],[Headphones,"Dedicated Support","Our team is here to help you succeed"]].map(([Icon,title,text]) => <article key={title}><i><Icon/></i><b>{title}</b><span>{text}</span></article>)}</section>
    <section className="org-stats"><div><p className="org-kicker">EVENT ORGANIZER SUCCESS</p><h2>Thousands<br/>of <em>Events, Countless Stories</em></h2><p>Join our growing community of event organizers and create unforgettable experiences.</p></div>{[[CalendarDays,"5,000+","Events Organized"],[Users,"2M+","Tickets Sold"],[Check,"95%","Organizers Satisfied"],[MapPin,"250+","Partner Venues"]].map(([Icon,value,label]) => <article key={label}><Icon/><b>{value}</b><span>{label}</span></article>)}</section>
    <section className="org-cta"><div/><section><p className="org-kicker">READY TO GET STARTED?</p><h2>Organize Your <em>First Event</em> Today</h2><span>It’s quick, easy and free to get started. Turn your ideas into unforgettable experiences with Eventoria.</span><button onClick={() => document.querySelector(".org-builder")?.scrollIntoView({behavior:"smooth"})}>Create Your Event <ArrowRight/></button></section></section>
    <SiteFooter/>
  </div>;
}
