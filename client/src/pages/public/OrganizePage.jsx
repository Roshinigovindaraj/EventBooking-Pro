import React from "react";
import { ArrowRight, BarChart3, CalendarDays, Check, FileText, Headphones, Image, MapPin, Megaphone, Play, Settings, ShieldCheck, Ticket, Users } from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import { apiRequest } from "../../services/apiClient.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isOrganizer = user?.roles?.includes('event_organizer');
  const [application, setApplication] = React.useState(null);
  const [profile, setProfile] = React.useState({ organizationName:'', phone:'', website:'', address:'', panGst:'', bankAccount:'', description:'' });
  const [step, setStep] = React.useState(0);
  const [notice, setNotice] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", category: "", subcategory: "", description: "", type: "in-person", venueName: "", city: "", address: "", startsAt: "", endsAt: "", ticketName: "General Admission", price: "499", capacity: "100", image: "" });
  const [imageMode, setImageMode] = React.useState('upload');
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [imageUpload, setImageUpload] = React.useState({ status:'idle', fileName:'', error:'' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  React.useEffect(() => { if (user && !isOrganizer) apiRequest('/organizer/applications/me').then(result => setApplication(result.items?.[0] || null)).catch(() => {}); }, [user, isOrganizer]);
  React.useEffect(() => { if (location.hash === '#become-organizer') window.setTimeout(() => document.getElementById('become-organizer')?.scrollIntoView({ behavior:'smooth', block:'start' }), 0); }, [location.hash]);
  const submitProfile = async event => { event.preventDefault(); setSaving(true); setNotice(''); try { const result = await apiRequest('/organizer/applications', { method:'POST', body:JSON.stringify({ details:profile }) }); setApplication(result.application); setNotice('Organizer profile submitted. An administrator will review it.'); } catch (error) { setNotice(error.message); } finally { setSaving(false); } };
  const chooseImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return setImageUpload({ status:'error', fileName:file.name, error:'Choose a JPG, PNG, or WebP image.' });
    if (file.size > 3 * 1024 * 1024) return setImageUpload({ status:'error', fileName:file.name, error:'The image must be smaller than 3 MB.' });
    setImageUpload({ status:'uploading', fileName:file.name, error:'' });
    const reader = new FileReader();
    reader.onload = async () => {
      setUploadingImage(true); setNotice('Uploading image to Cloudinary…');
      try {
        const result = await apiRequest('/uploads/event-image', { method:'POST', body:JSON.stringify({ image:String(reader.result) }) });
        setForm(current => ({ ...current, image:result.image.url }));
        setImageUpload({ status:'success', fileName:file.name, error:'' });
        setNotice('');
      } catch (error) {
        const message = error.status === 401 ? 'Your login session expired. Sign in again, then retry the upload.' : error.message;
        setImageUpload({ status:'error', fileName:file.name, error:message });
        setNotice('');
      }
      finally { setUploadingImage(false); event.target.value = ''; }
    };
    reader.onerror = () => setImageUpload({ status:'error', fileName:file.name, error:'The image could not be read. Please try another file.' });
    reader.readAsDataURL(file);
  };
  const saveEvent = async (submit) => {
    setSaving(true); setNotice("");
    try {
      const required = [['title','Event title',0],['category','Event category',0],['subcategory','Event subcategory',0],['description','Description',0],['venueName','Venue name',1],['city','City',1],['startsAt','Start date and time',1],['endsAt','End date and time',1],['ticketName','Ticket name',2],['price','Ticket price',2],['capacity','Ticket capacity',2]];
      const missing = required.find(([key]) => !String(form[key] ?? '').trim());
      if (missing) { setStep(missing[2]); throw new Error(`${missing[1]} is required.`); }
      if (form.description.trim().length < 20) { setStep(0); throw new Error('Description must contain at least 20 characters.'); }
      if (new Date(form.endsAt) <= new Date(form.startsAt)) { setStep(1); throw new Error('Event end must be after its start.'); }
      if (Number(form.capacity) < 1 || Number(form.price) < 0) { setStep(2); throw new Error('Enter a valid ticket price and capacity.'); }
      const payload = { title: form.title, description: form.description, category: form.category, subcategory: form.subcategory, venueName: form.venueName, city: form.city, address: form.address, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), images: form.image ? [form.image] : [], ticketTypes: [{ name: form.ticketName, priceMinor: Math.round(Number(form.price) * 100), currency: "INR", capacity: Number(form.capacity), minPerOrder: 1, maxPerOrder: 10 }] };
      const result = await apiRequest("/organizer/events", { method: "POST", body: JSON.stringify(payload) });
      if (submit) await apiRequest(`/organizer/events/${result.event._id}/submit`, { method: "POST" });
      setNotice(submit ? "Event submitted for admin approval. It will appear to customers after approval." : "Event draft saved in your organizer workspace.");
      window.dispatchEvent(new Event("eventoria:data-changed"));
      if (submit) window.setTimeout(() => navigate('/portal/organizer'), 900);
    } catch (error) { setNotice(error.status === 401 || error.status === 403 ? "Sign in with an approved Event Organizer account to save this event." : error.message); }
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
        <div className="org-hero-actions"><button onClick={() => document.getElementById(isOrganizer ? 'event-builder' : 'become-organizer')?.scrollIntoView({behavior:"smooth"})}>{isOrganizer ? 'Create Your Event' : 'Become an Organizer'} <ArrowRight/></button><button className="org-watch"><i><Play fill="currentColor"/></i><b>Watch<br/>How It Works</b></button></div>
      </div>
      <div className="org-hero-image"><div><span>Plan</span><span>Promote</span><span>Sell Tickets</span><span>Manage</span><span>Create Memories</span></div></div>
    </section>

    <section className="org-quick">
      <p className="org-kicker">GET STARTED IN MINUTES</p><h2>Create Your Event in <em>4 Simple Steps</em></h2>
      <div>{quickSteps.map(([title, text, Icon], index) => <React.Fragment key={title}><article><b>{index + 1}</b><i><Icon/></i><h3>{title}</h3><p>{text}</p></article>{index < 3 && <ArrowRight className="org-step-arrow"/>}</React.Fragment>)}</div>
    </section>

    {!isOrganizer && <section id="become-organizer" className="organizer-onboarding"><div><p className="org-kicker">BECOME AN ORGANIZER</p><h2>Complete your organizer profile</h2><p>Submit your organization, contact, compliance and settlement details for admin approval.</p>{!user && <p className="onboarding-callout">Sign in or create an account first, then complete your organizer profile.<span><Link to="/auth/login" state={{ from:'/organize#become-organizer' }}>Sign in</Link><Link to="/auth/register" state={{ from:'/organize#become-organizer' }}>Create account</Link></span></p>}{application && <div className="application-state"><ShieldCheck/><span><b>Application {application.status}</b><small>{application.feedback || (application.status === 'pending' ? 'Your profile is under admin review.' : 'Sign in again after approval to open your organizer workspace.')}</small></span></div>}</div>{user && !application && <form onSubmit={submitProfile}><label>Organization / brand name<input required value={profile.organizationName} onChange={e => setProfile({...profile,organizationName:e.target.value})}/></label><label>Mobile number<input required value={profile.phone} onChange={e => setProfile({...profile,phone:e.target.value})}/></label><label>Website / social link<input type="url" value={profile.website} onChange={e => setProfile({...profile,website:e.target.value})}/></label><label>Business address<input required value={profile.address} onChange={e => setProfile({...profile,address:e.target.value})}/></label><label>PAN / GST (optional)<input value={profile.panGst} onChange={e => setProfile({...profile,panGst:e.target.value})}/></label><label>Bank account / UPI for settlements<input required value={profile.bankAccount} onChange={e => setProfile({...profile,bankAccount:e.target.value})}/></label><label className="wide">Organizer description<textarea required minLength="20" value={profile.description} onChange={e => setProfile({...profile,description:e.target.value})}/></label><button disabled={saving}>{saving ? 'Submitting…' : 'Submit for approval'} <ArrowRight/></button></form>}</section>}

    {isOrganizer && <section id="event-builder" className="org-builder">
      <aside>{steps.map(([title, text, Icon], index) => <button type="button" disabled={index > step} className={step === index ? "active" : ""} onClick={() => setStep(index)} key={title}><b>{index + 1}</b><span><strong>{title}</strong><small>{text}</small></span><Icon/></button>)}</aside>
      <form onSubmit={(event) => { event.preventDefault(); saveEvent(true); }}>
        <h2>{steps[step][0]}</h2><p>This information will be visible to your audience.</p>
        {step === 0 ? <>
          <div className="org-form-grid"><label>Event Title <em>*</em><input value={form.title} onChange={update("title")} placeholder="Enter event title" required/></label><label>Event Category <em>*</em><select value={form.category} onChange={(event) => setForm(current => ({ ...current, category: event.target.value, subcategory: "" }))} required><option value="">Select category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label>Subcategory <em>*</em><select value={form.subcategory} onChange={update("subcategory")} required><option value="">Select subcategory</option>{(categoryOptions[form.category] || []).map(value => <option key={value}>{value}</option>)}</select></label></div>
          <label>Short Description <em>*</em><textarea minLength="20" maxLength="200" value={form.description} onChange={update("description")} placeholder="Write at least 20 characters about your event..." required/><small>{form.description.length}/200</small></label>
          <fieldset><legend>Event Type <em>*</em></legend>{[["online","Online Event"],["in-person","In-Person Event"],["hybrid","Hybrid Event"]].map(([value,label]) => <label key={value}><input type="radio" name="eventType" value={value} checked={form.type === value} onChange={update("type")}/><span/>{label}</label>)}</fieldset>
        </> : step === 1 ? <div className="org-form-grid"><label>Venue Name <em>*</em><input value={form.venueName} onChange={update("venueName")} required/></label><label>City <em>*</em><input value={form.city} onChange={update("city")} required/></label><label>Address<input value={form.address} onChange={update("address")}/></label><label>Starts At <em>*</em><input type="datetime-local" value={form.startsAt} onChange={update("startsAt")} required/></label><label>Ends At <em>*</em><input type="datetime-local" value={form.endsAt} onChange={update("endsAt")} required/></label></div> : step === 2 ? <div className="org-form-grid"><label>Ticket Name <em>*</em><input value={form.ticketName} onChange={update("ticketName")} required/></label><label>Price (INR) <em>*</em><input type="number" min="0" value={form.price} onChange={update("price")} required/></label><label>Capacity <em>*</em><input type="number" min="1" value={form.capacity} onChange={update("capacity")} required/></label></div> : step === 3 ? <div className="event-media-field"><div className="media-mode"><button type="button" className={imageMode === 'upload' ? 'active' : ''} onClick={() => setImageMode('upload')}>Upload image</button><button type="button" className={imageMode === 'url' ? 'active' : ''} onClick={() => setImageMode('url')}>Use image URL</button></div>{imageMode === 'upload' ? <label className={`event-upload ${uploadingImage ? 'uploading' : ''}`}><Image/><b>{uploadingImage ? 'Uploading to Cloudinary…' : 'Choose event banner'}</b><span>JPG, PNG or WebP · maximum 3 MB</span><input disabled={uploadingImage} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage}/></label> : <label>Public image URL<input type="url" value={form.image} onChange={update("image")} placeholder="https://example.com/event-banner.jpg"/></label>}{imageMode === 'upload' && imageUpload.status !== 'idle' && <div className={`image-upload-status ${imageUpload.status}`} role="status">{imageUpload.status === 'uploading' && <i/>}{imageUpload.status === 'success' && <Check/>}<span><b>{imageUpload.status === 'uploading' ? 'Uploading image…' : imageUpload.status === 'success' ? 'Uploaded successfully to Cloudinary' : 'Upload failed'}</b><small>{imageUpload.status === 'error' ? imageUpload.error : imageUpload.fileName}</small></span></div>}{form.image && <div className="event-image-preview"><img src={form.image} alt="Event banner preview"/><button type="button" onClick={() => { setForm(current => ({ ...current, image:'' })); setImageUpload({ status:'idle', fileName:'', error:'' }); }}>Remove image</button></div>}</div> : <div className="org-step-placeholder"><Check/><h3>Ready for approval</h3><p>Submitting sends this event to the Admin workspace. Customers see it only after approval.</p></div>}
        <div className="org-form-actions"><button type="button" className="draft" disabled={saving || uploadingImage} onClick={() => saveEvent(false)}>Save as Draft</button><button disabled={saving || uploadingImage} type={step === 4 ? "submit" : "button"} onClick={(event) => step < 4 && event.currentTarget.form.reportValidity() && setStep(step + 1)}>{saving ? "Saving..." : step === 4 ? "Submit Event" : "Next Step"} <ArrowRight/></button></div>
        {notice && <div className={`org-saved ${/required|failed|error|expired|cannot|invalid/i.test(notice) ? 'error' : ''}`}><Check/> {notice}</div>}
      </form>
    </section>}

    <section className="org-categories"><div><p className="org-kicker">EVENT CATEGORIES</p><h2>Organize <em>Any Type</em><br/>of Event</h2><p>From personal celebrations to professional conferences, Eventoria supports all kinds of events.</p></div><div>{categories.map((category, index) => <button key={category}><i>{["♫","◉","♬","▣","⚽","△","♩","▥"][index]}</i><b>{category}</b></button>)}</div></section>
    <section className="org-why"><div><p className="org-kicker">WHY ORGANIZE WITH EVENTORIA?</p><h2>More Than Just<br/><em>Event Management</em></h2><p>We provide all the tools you need to create, promote and manage successful events.</p></div>{[[Users,"Wide Reach","Get discovered by thousands of event-goers"],[Ticket,"Flexible Ticketing","Multiple ticket types and pricing options"],[BarChart3,"Real-time Analytics","Track ticket sales and audience insights"],[Headphones,"Dedicated Support","Our team is here to help you succeed"]].map(([Icon,title,text]) => <article key={title}><i><Icon/></i><b>{title}</b><span>{text}</span></article>)}</section>
    <section className="org-stats"><div><p className="org-kicker">EVENT ORGANIZER SUCCESS</p><h2>Thousands<br/>of <em>Events, Countless Stories</em></h2><p>Join our growing community of event organizers and create unforgettable experiences.</p></div>{[[CalendarDays,"5,000+","Events Organized"],[Users,"2M+","Tickets Sold"],[Check,"95%","Organizers Satisfied"],[MapPin,"250+","Partner Venues"]].map(([Icon,value,label]) => <article key={label}><Icon/><b>{value}</b><span>{label}</span></article>)}</section>
    <section className="org-cta"><div/><section><p className="org-kicker">READY TO GET STARTED?</p><h2>Organize Your <em>First Event</em> Today</h2><span>It’s quick, easy and free to get started. Turn your ideas into unforgettable experiences with Eventoria.</span><button onClick={() => document.querySelector(".org-builder")?.scrollIntoView({behavior:"smooth"})}>Create Your Event <ArrowRight/></button></section></section>
    <SiteFooter/>
  </div>;
}
