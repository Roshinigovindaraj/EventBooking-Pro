import React from "react";
import { ArrowRight, BarChart3, CalendarDays, Check, FileText, Headphones, Image, MapPin, Megaphone, Play, Settings, ShieldCheck, Ticket, Users } from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";

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

const categories = ["Concerts", "Weddings", "Parties", "Business Events", "Sports", "Festivals", "Workshops", "Exhibitions"];

export default function OrganizePage() {
  const [step, setStep] = React.useState(0);
  const [saved, setSaved] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", category: "", description: "", type: "in-person" });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

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
      <form onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
        <h2>{steps[step][0]}</h2><p>This information will be visible to your audience.</p>
        {step === 0 ? <>
          <div className="org-form-grid"><label>Event Title <em>*</em><input value={form.title} onChange={update("title")} placeholder="Enter event title" required/></label><label>Event Category <em>*</em><select value={form.category} onChange={update("category")} required><option value="">Select category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label></div>
          <label>Short Description <em>*</em><textarea maxLength="200" value={form.description} onChange={update("description")} placeholder="Write a short description about your event..." required/><small>{form.description.length}/200</small></label>
          <fieldset><legend>Event Type <em>*</em></legend>{[["online","Online Event"],["in-person","In-Person Event"],["hybrid","Hybrid Event"]].map(([value,label]) => <label key={value}><input type="radio" name="eventType" value={value} checked={form.type === value} onChange={update("type")}/><span/>{label}</label>)}</fieldset>
        </> : <div className="org-step-placeholder">{React.createElement(steps[step][2])}<h3>{steps[step][0]}</h3><p>Continue building your event. You can return to any completed step from the menu.</p></div>}
        <div className="org-form-actions"><button type="button" className="draft" onClick={() => setSaved(true)}>Save as Draft</button><button type={step === 4 ? "submit" : "button"} onClick={() => step < 4 && setStep(step + 1)}>{step === 4 ? "Publish Event" : "Next Step"} <ArrowRight/></button></div>
        {saved && <div className="org-saved"><Check/> Your event draft has been saved.</div>}
      </form>
    </section>

    <section className="org-categories"><div><p className="org-kicker">EVENT CATEGORIES</p><h2>Organize <em>Any Type</em><br/>of Event</h2><p>From personal celebrations to professional conferences, Eventoria supports all kinds of events.</p></div><div>{categories.map((category, index) => <button key={category}><i>{["♫","◉","♬","▣","⚽","△","♩","▥"][index]}</i><b>{category}</b></button>)}</div></section>
    <section className="org-why"><div><p className="org-kicker">WHY ORGANIZE WITH EVENTORIA?</p><h2>More Than Just<br/><em>Event Management</em></h2><p>We provide all the tools you need to create, promote and manage successful events.</p></div>{[[Users,"Wide Reach","Get discovered by thousands of event-goers"],[Ticket,"Flexible Ticketing","Multiple ticket types and pricing options"],[BarChart3,"Real-time Analytics","Track ticket sales and audience insights"],[Headphones,"Dedicated Support","Our team is here to help you succeed"]].map(([Icon,title,text]) => <article key={title}><i><Icon/></i><b>{title}</b><span>{text}</span></article>)}</section>
    <section className="org-stats"><div><p className="org-kicker">EVENT ORGANIZER SUCCESS</p><h2>Thousands<br/>of <em>Events, Countless Stories</em></h2><p>Join our growing community of event organizers and create unforgettable experiences.</p></div>{[[CalendarDays,"5,000+","Events Organized"],[Users,"2M+","Tickets Sold"],[Check,"95%","Organizers Satisfied"],[MapPin,"250+","Partner Venues"]].map(([Icon,value,label]) => <article key={label}><Icon/><b>{value}</b><span>{label}</span></article>)}</section>
    <section className="org-cta"><div/><section><p className="org-kicker">READY TO GET STARTED?</p><h2>Organize Your <em>First Event</em> Today</h2><span>It’s quick, easy and free to get started. Turn your ideas into unforgettable experiences with Eventoria.</span><button onClick={() => document.querySelector(".org-builder")?.scrollIntoView({behavior:"smooth"})}>Create Your Event <ArrowRight/></button></section></section>
    <SiteFooter/>
  </div>;
}
