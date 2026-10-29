import React from "react";
import { AlertCircle, ArrowRight, BarChart3, CalendarDays, Check, Clock, FileText, Headphones, Image, MapPin, Megaphone, Play, Settings, ShieldCheck, Ticket, Users, Plus, Trash2, Crown, Sparkles } from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import { apiRequest } from "../../services/apiClient.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fireConfettiCelebration } from "../../components/CelebrationPoppers.jsx";

const steps = [
  ["Event Details", "Basic information", FileText],
  ["Venue & Date", "Location and schedule", MapPin],
  ["Tickets & Pricing", "Ticket types and pricing", Ticket],
  ["Media & Description", "Images and event details", Image],
  ["Review & Publish", "Check and go live", Check],
];

const TICKET_PRESETS = [
  {
    key: "general",
    label: "General Admission",
    icon: "⭐",
    name: "General Admission",
    defaultPrice: "200",
    defaultCapacity: "100",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    perk: "Standard entry & seated/standing zone",
  },
  {
    key: "vip",
    label: "VIP Pass",
    icon: "👑",
    name: "VIP Pass",
    defaultPrice: "600",
    defaultCapacity: "30",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    perk: "Fast-track gate access, premium seating & VIP lounge",
  },
  {
    key: "vvip",
    label: "VVIP / Premium",
    icon: "💎",
    name: "VVIP All-Access Pass",
    defaultPrice: "1200",
    defaultCapacity: "15",
    color: "#be185d",
    bg: "#fdf2f8",
    border: "#fbcfe8",
    perk: "Front row seating, backstage access & complimentary drinks",
  },
  {
    key: "early_bird",
    label: "Early Bird",
    icon: "⚡",
    name: "Early Bird Special",
    defaultPrice: "100",
    defaultCapacity: "50",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    perk: "Limited discounted early registration tickets",
  },
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

function to24Hour(timeStr, ampm) {
  if (!timeStr) return '10:00';
  const parts = String(timeStr).trim().split(':');
  let h = parseInt(parts[0], 10);
  let m = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;
  if (isNaN(h)) h = 10;
  if (isNaN(m)) m = 0;
  h = Math.max(1, Math.min(12, h));
  m = Math.max(0, Math.min(59, m));
  if (ampm === 'PM' && h < 12) h += 12;
  else if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatScheduleDisplay(dateStr, timeStr, ampm) {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
    return `✓ Scheduled: ${dayName}, ${day} ${monthName} ${year} at ${timeStr || '10:00'} ${ampm}`;
  } catch {
    return `✓ ${dateStr} at ${timeStr || '10:00'} ${ampm}`;
  }
}

export default function OrganizePage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isOrganizer = user?.roles?.includes('event_organizer');
  const [application, setApplication] = React.useState(null);
  const [profile, setProfile] = React.useState({
    organizationName: '',
    phone: '',
    website: '',
    address: '',
    panGst: '',
    bankAccount: '',
    description: '',
    eventCategory: 'Entertainment',
    eventSubcategory: 'Concert',
    plannedEventTitle: '',
    targetCity: '',
    expectedAttendees: '100 - 500',
    eventType: 'in-person',
  });
  const [editingPending, setEditingPending] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [notice, setNotice] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [profileNotice, setProfileNotice] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", category: "", subcategory: "", description: "", type: "in-person", venueName: "", city: "", address: "", startsAt: "", endsAt: "", ticketName: "General Admission", price: "200", capacity: "100", image: "" });

  const [tickets, setTickets] = React.useState([
    { id: 't_1', tierKey: 'general', name: 'General Admission', price: '200', capacity: '100' }
  ]);

  const updateTicket = (id, field, value) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, [field]: value };
        if (field === 'name') {
          const lower = value.toLowerCase();
          if (lower.includes('vip') && !lower.includes('vvip')) updated.tierKey = 'vip';
          else if (lower.includes('vvip')) updated.tierKey = 'vvip';
          else if (lower.includes('early')) updated.tierKey = 'early_bird';
          else updated.tierKey = 'general';
        }
        return updated;
      }
      return t;
    }));
  };

  const addTicketTier = (presetKey = 'vip') => {
    const preset = TICKET_PRESETS.find(p => p.key === presetKey) || TICKET_PRESETS[1];
    const newId = 't_' + Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setTickets(prev => [
      ...prev,
      {
        id: newId,
        tierKey: preset.key,
        name: preset.name,
        price: preset.defaultPrice,
        capacity: preset.defaultCapacity
      }
    ]);
  };

  const applyPresetToTicket = (id, presetKey) => {
    const preset = TICKET_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          tierKey: preset.key,
          name: preset.name,
          price: preset.defaultPrice,
          capacity: preset.defaultCapacity
        };
      }
      return t;
    }));
  };

  const removeTicketTier = (id) => {
    if (tickets.length <= 1) return;
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  React.useEffect(() => {
    if (tickets.length > 0) {
      setForm(curr => ({
        ...curr,
        ticketName: tickets[0].name,
        price: tickets[0].price,
        capacity: tickets[0].capacity,
      }));
    }
  }, [tickets]);

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const [startDate, setStartDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('10:00');
  const [startAmPm, setStartAmPm] = React.useState('AM');

  const [endDate, setEndDate] = React.useState('');
  const [endTime, setEndTime] = React.useState('01:00');
  const [endAmPm, setEndAmPm] = React.useState('PM');

  React.useEffect(() => {
    if (startDate) {
      const time24 = to24Hour(startTime, startAmPm);
      setForm((curr) => ({ ...curr, startsAt: `${startDate}T${time24}` }));
    } else {
      setForm((curr) => ({ ...curr, startsAt: '' }));
    }
  }, [startDate, startTime, startAmPm]);

  React.useEffect(() => {
    if (endDate) {
      const time24 = to24Hour(endTime, endAmPm);
      setForm((curr) => ({ ...curr, endsAt: `${endDate}T${time24}` }));
    } else {
      setForm((curr) => ({ ...curr, endsAt: '' }));
    }
  }, [endDate, endTime, endAmPm]);

  const [imageMode, setImageMode] = React.useState('upload');
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [imageUpload, setImageUpload] = React.useState({ status:'idle', fileName:'', error:'' });
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  React.useEffect(() => {
    if (user && !isOrganizer) {
      apiRequest('/organizer/applications/me')
        .then((result) => {
          const app = result.items?.[0] || null;
          setApplication(app);
          if (app?.details) {
            setProfile((prev) => ({
              ...prev,
              ...app.details,
              eventCategory: app.details.eventCategory || 'Entertainment',
              eventSubcategory: app.details.eventSubcategory || 'Concert',
            }));
          }
        })
        .catch(() => {});
    }
  }, [user, isOrganizer]);
  React.useEffect(() => { if (location.hash === '#become-organizer') window.setTimeout(() => document.getElementById('become-organizer')?.scrollIntoView({ behavior:'smooth', block:'start' }), 0); }, [location.hash]);
  const submitProfile = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    setFormError('');
    setProfileNotice('');

    // Field validation with visible error messaging
    if (!profile.organizationName?.trim()) {
      setFormError('Please enter your Organization / Brand name.');
      return;
    }
    if (!profile.phone?.trim()) {
      setFormError('Please enter your Mobile number.');
      return;
    }
    if (!profile.address?.trim()) {
      setFormError('Please enter your Business address.');
      return;
    }
    if (!profile.bankAccount?.trim()) {
      setFormError('Please enter your Bank account or UPI ID for ticket settlements.');
      return;
    }
    if (!profile.description?.trim() || profile.description.trim().length < 20) {
      setFormError('Organizer experience & proposal description must contain at least 20 characters.');
      return;
    }

    // Smart auto-fill for Section 1 if empty so submission is never blocked
    const plannedTitle = profile.plannedEventTitle?.trim() || `${profile.organizationName.trim()} Event Showcase`;
    const targetCity = profile.targetCity?.trim() || (profile.address.split(',').slice(-2, -1)[0]?.trim()) || 'Tamil Nadu';
    const subcategory = profile.eventSubcategory?.trim() || (categoryOptions[profile.eventCategory] || [])[0] || 'Concert';

    const submissionPayload = {
      ...profile,
      plannedEventTitle: plannedTitle,
      targetCity: targetCity,
      eventCategory: profile.eventCategory || 'Entertainment',
      eventSubcategory: subcategory,
      expectedAttendees: profile.expectedAttendees || '100 - 500',
      eventType: profile.eventType || 'in-person',
    };

    setSaving(true);
    try {
      const isUpdating = Boolean(application && application.status === 'pending');
      const method = isUpdating ? 'PUT' : 'POST';
      const endpoint = isUpdating ? '/organizer/applications/pending' : '/organizer/applications';
      let result;
      try {
        result = await apiRequest(endpoint, {
          method,
          body: JSON.stringify({ details: submissionPayload }),
        });
      } catch (err) {
        if (err.status === 409 || err.message?.includes('already pending')) {
          result = await apiRequest('/organizer/applications/pending', {
            method: 'PUT',
            body: JSON.stringify({ details: submissionPayload }),
          });
        } else {
          throw err;
        }
      }

      setApplication(result.application);
      setEditingPending(false);
      fireConfettiCelebration();
      setProfileNotice('✓ Application submitted successfully! An administrator will review your proposal.');
      window.dispatchEvent(new Event('eventoria:data-changed'));
    } catch (error) {
      setFormError(error.message || 'Failed to submit application. Please retry.');
    } finally {
      setSaving(false);
    }
  };
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
      const required = [
        ['title', 'Event title', 0],
        ['category', 'Event category', 0],
        ['subcategory', 'Event subcategory', 0],
        ['description', 'Description', 0],
        ['venueName', 'Venue name', 1],
        ['city', 'City', 1],
        ['startsAt', 'Start date and time', 1],
        ['endsAt', 'End date and time', 1]
      ];
      const missing = required.find(([key]) => !String(form[key] ?? '').trim());
      if (missing) { setStep(missing[2]); throw new Error(`${missing[1]} is required.`); }
      if (form.description.trim().length < 20) { setStep(0); throw new Error('Description must contain at least 20 characters.'); }
      if (new Date(form.endsAt) <= new Date(form.startsAt)) { setStep(1); throw new Error('Event end must be after its start.'); }

      if (!tickets.length) { setStep(2); throw new Error('At least one ticket tier is required.'); }
      for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        if (!t.name.trim()) { setStep(2); throw new Error(`Ticket name is required for tier #${i + 1}.`); }
        if (Number(t.price) < 0 || isNaN(Number(t.price))) { setStep(2); throw new Error(`Enter a valid price for ticket "${t.name}".`); }
        if (Number(t.capacity) < 1 || isNaN(Number(t.capacity))) { setStep(2); throw new Error(`Enter a valid capacity (at least 1) for ticket "${t.name}".`); }
      }

      const ticketTypes = tickets.map(t => ({
        name: t.name.trim(),
        priceMinor: Math.round(Number(t.price) * 100),
        currency: "INR",
        capacity: Number(t.capacity),
        minPerOrder: 1,
        maxPerOrder: 10
      }));

      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        subcategory: form.subcategory,
        venueName: form.venueName,
        city: form.city,
        address: form.address,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        images: form.image ? [form.image] : [],
        ticketTypes
      };
      const result = await apiRequest("/organizer/events", { method: "POST", body: JSON.stringify(payload) });
      if (submit) {
        await apiRequest(`/organizer/events/${result.event._id}/submit`, { method: "POST" });
        fireConfettiCelebration();
      }
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

    {!isOrganizer && (
      <section id="become-organizer" className="organizer-onboarding">
        <div>
          <p className="org-kicker">BECOME AN ORGANIZER</p>
          <h2>Complete your organizer profile & event proposal</h2>
          <p>
            Tell the administrator what kind of events you plan to organize, along with your organization and settlement details for quick approval.
          </p>
          {!user && (
            <p className="onboarding-callout">
              Sign in or create an account first, then complete your organizer profile.
              <span>
                <Link to="/auth/login" state={{ from: '/organize#become-organizer' }}>Sign in</Link>
                <Link to="/auth/register" state={{ from: '/organize#become-organizer' }}>Create account</Link>
              </span>
            </p>
          )}

          {application && !editingPending && (
            <div style={{ marginTop: 14 }}>
              <div className="application-state">
                <ShieldCheck />
                <span>
                  <b>Application {application.status?.toUpperCase()}</b>
                  <small>
                    {application.feedback ||
                      (application.status === 'pending'
                        ? 'Your event proposal and organizer profile are currently under admin review.'
                        : 'Sign in again after approval to open your organizer workspace.')}
                  </small>
                </span>
              </div>

              {/* Submitted Event Proposal Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', marginTop: 14 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 15, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarDays size={16} color="#2563eb" /> Proposed Event Details Sent to Admin
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 13, marginBottom: 12 }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>EVENT CATEGORY</span>
                    <b style={{ color: '#0f172a' }}>{profile.eventCategory || 'Entertainment'} {profile.eventSubcategory ? `· ${profile.eventSubcategory}` : ''}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>PROPOSED EVENT</span>
                    <b style={{ color: '#0f172a' }}>{profile.plannedEventTitle || 'General Event Showcase'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>TARGET CITY</span>
                    <b style={{ color: '#0f172a' }}>{profile.targetCity || profile.address || 'Tamil Nadu'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, display: 'block' }}>EXPECTED AUDIENCE</span>
                    <b style={{ color: '#0f172a' }}>{profile.expectedAttendees || '100 - 500'} attendees</b>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#475569', background: '#fff', border: '1px solid #e2e8f0', padding: '10px 12px', borderRadius: 8, marginBottom: 12 }}>
                  <b>Organization:</b> {profile.organizationName || 'Not specified'} · <b>Phone:</b> {profile.phone || 'Not specified'}
                  <p style={{ margin: '4px 0 0', color: '#64748b' }}>{profile.description}</p>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {application.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => setEditingPending(true)}
                      style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ✏️ Edit / Change Event Category & Proposal
                    </button>
                  )}
                  <small style={{ color: '#64748b' }}>
                    Admins can view and approve your application directly from the Admin Workspace.
                  </small>
                </div>
              </div>
            </div>
          )}
        </div>

        {user && (!application || editingPending) && (
          <form onSubmit={submitProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. EVENT SPECIFICATION SECTION */}
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1d4ed8' }}>
                <CalendarDays size={18} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e40af' }}>
                  1. What Kind of Event Are You Planning to Organize?
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#3b82f6', lineHeight: 1.4 }}>
                This tells the administrator your event genre, theme, and audience scale so they can review and approve your application quickly.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                  Event Category <em>*</em>
                  <select
                    required
                    value={profile.eventCategory}
                    onChange={(e) => setProfile({ ...profile, eventCategory: e.target.value, eventSubcategory: (categoryOptions[e.target.value] || [])[0] || '' })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, background: '#fff' }}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                  Subcategory / Specific Type <em>*</em>
                  <select
                    required
                    value={profile.eventSubcategory}
                    onChange={(e) => setProfile({ ...profile, eventSubcategory: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, background: '#fff' }}
                  >
                    <option value="">Select subcategory</option>
                    {(categoryOptions[profile.eventCategory] || []).map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                  Proposed Event Title / Concept
                  <input
                    placeholder="e.g. South India Music Festival 2026, Startup Innovation Summit"
                    value={profile.plannedEventTitle}
                    onChange={(e) => setProfile({ ...profile, plannedEventTitle: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, background: '#fff' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                  Target City
                  <input
                    placeholder="e.g. Chennai, Salem, Hyderabad"
                    value={profile.targetCity}
                    onChange={(e) => setProfile({ ...profile, targetCity: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, background: '#fff' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                  Expected Audience Scale
                  <select
                    value={profile.expectedAttendees}
                    onChange={(e) => setProfile({ ...profile, expectedAttendees: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, background: '#fff' }}
                  >
                    <option value="Under 100">Under 100 attendees</option>
                    <option value="100 - 500">100 – 500 attendees</option>
                    <option value="500 - 1,500">500 – 1,500 attendees</option>
                    <option value="1,500 - 5,000">1,500 – 5,000 attendees</option>
                    <option value="5,000+">5,000+ attendees</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>
                  Event Format
                  <select
                    value={profile.eventType}
                    onChange={(e) => setProfile({ ...profile, eventType: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, background: '#fff' }}
                  >
                    <option value="in-person">In-Person Event</option>
                    <option value="online">Online / Virtual Event</option>
                    <option value="hybrid">Hybrid Event</option>
                  </select>
                </label>
              </div>
            </div>

            {/* 2. ORGANIZATION & PROFILE DETAILS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#334155' }}>
                2. Organization & Settlement Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Organization / brand name <em>*</em>
                  <input required value={profile.organizationName} onChange={(e) => setProfile({ ...profile, organizationName: e.target.value })} />
                </label>
                <label>
                  Mobile number <em>*</em>
                  <input required value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Website / social link
                  <input type="text" placeholder="https://instagram.com/your-brand or handle" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} />
                </label>
                <label>
                  Business address <em>*</em>
                  <input required value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  Bank account / UPI for ticket settlements <em>*</em>
                  <input required placeholder="Account No. / UPI ID" value={profile.bankAccount} onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })} />
                </label>
                <label>
                  PAN / GST (optional)
                  <input value={profile.panGst} onChange={(e) => setProfile({ ...profile, panGst: e.target.value })} />
                </label>
              </div>

              <label className="wide">
                Organizer experience & event proposal description <em>*</em>
                <textarea
                  required
                  rows={3}
                  minLength="20"
                  placeholder="Tell the administrator about your experience organizing events and what you plan to accomplish..."
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                />
              </label>
            </div>

            {formError && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: '10px',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={18} color="#dc2626" />
                <span>{formError}</span>
              </div>
            )}

            {profileNotice && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#ecfdf5',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '10px',
                  color: '#047857',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Check size={18} color="#047857" />
                <span>{profileNotice}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                disabled={saving}
                type="submit"
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  letterSpacing: '0.3px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease-in-out',
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? 'Submitting Application…' : editingPending ? 'Update Event Proposal & Profile' : 'Submit for Admin Approval'} <ArrowRight size={18} />
              </button>
              {editingPending && (
                <button
                  type="button"
                  onClick={() => setEditingPending(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '14px 18px', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    )}

    {isOrganizer && <section id="event-builder" className="org-builder">
      <aside>{steps.map(([title, text, Icon], index) => <button type="button" disabled={index > step} className={step === index ? "active" : ""} onClick={() => setStep(index)} key={title}><b>{index + 1}</b><span><strong>{title}</strong><small>{text}</small></span><Icon/></button>)}</aside>
      <form onSubmit={(event) => { event.preventDefault(); saveEvent(true); }}>
        <h2>{steps[step][0]}</h2><p>This information will be visible to your audience.</p>
        {step === 0 ? <>
          <div className="org-form-grid"><label>Event Title <em>*</em><input value={form.title} onChange={update("title")} placeholder="Enter event title" required/></label><label>Event Category <em>*</em><select value={form.category} onChange={(event) => setForm(current => ({ ...current, category: event.target.value, subcategory: "" }))} required><option value="">Select category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label>Subcategory <em>*</em><select value={form.subcategory} onChange={update("subcategory")} required><option value="">Select subcategory</option>{(categoryOptions[form.category] || []).map(value => <option key={value}>{value}</option>)}</select></label></div>
          <label>Short Description <em>*</em><textarea minLength="20" maxLength="200" value={form.description} onChange={update("description")} placeholder="Write at least 20 characters about your event..." required/><small>{form.description.length}/200</small></label>
          <fieldset><legend>Event Type <em>*</em></legend>{[["online","Online Event"],["in-person","In-Person Event"],["hybrid","Hybrid Event"]].map(([value,label]) => <label key={value}><input type="radio" name="eventType" value={value} checked={form.type === value} onChange={update("type")}/><span/>{label}</label>)}</fieldset>
        </> : step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="org-form-grid" style={{ marginBottom: 0 }}>
              <label>Venue Name <em>*</em><input value={form.venueName} onChange={update("venueName")} placeholder="e.g. Royal Grand Palace" required/></label>
              <label>City <em>*</em><input value={form.city} onChange={update("city")} placeholder="e.g. Chennai" required/></label>
              <label style={{ gridColumn: '1 / -1' }}>Address<input value={form.address} onChange={update("address")} placeholder="e.g. 100 Mount Road, Guindy"/></label>
            </div>

            {/* Clear Date & 12-Hour Time with AM / PM Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Starts At Box */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '13px' }}>
                    <CalendarDays size={16} color="#e11d48" /> Starts At <em>*</em>
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>12-Hour (AM / PM)</span>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    Event Date <em>*</em>
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={startDate}
                    required
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate) setEndDate(e.target.value);
                    }}
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', color: '#1e293b' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    Enter Time & Select AM / PM <em>*</em>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="10:00"
                      maxLength={5}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value.replace(/[^0-9:]/g, ''))}
                      required
                      title="Enter time like 10:00, 11:30, 06:00"
                      style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '15px', fontWeight: 600, textAlign: 'center', color: '#1e293b' }}
                    />
                    <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#fff' }}>
                      <button
                        type="button"
                        onClick={() => setStartAmPm('AM')}
                        style={{
                          padding: '0 16px',
                          height: '38px',
                          border: 0,
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: startAmPm === 'AM' ? '#e11d48' : '#fff',
                          color: startAmPm === 'AM' ? '#fff' : '#64748b'
                        }}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartAmPm('PM')}
                        style={{
                          padding: '0 16px',
                          height: '38px',
                          border: 0,
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: startAmPm === 'PM' ? '#e11d48' : '#fff',
                          color: startAmPm === 'PM' ? '#fff' : '#64748b'
                        }}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {startDate && (
                  <div style={{ fontSize: '11px', color: '#047857', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                    {formatScheduleDisplay(startDate, startTime, startAmPm)}
                  </div>
                )}
              </div>

              {/* Ends At Box */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '13px' }}>
                    <Clock size={16} color="#e11d48" /> Ends At <em>*</em>
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>12-Hour (AM / PM)</span>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    Event Date <em>*</em>
                  </label>
                  <input
                    type="date"
                    min={startDate || todayStr}
                    value={endDate}
                    required
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', color: '#1e293b' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    Enter Time & Select AM / PM <em>*</em>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="01:00"
                      maxLength={5}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value.replace(/[^0-9:]/g, ''))}
                      required
                      title="Enter time like 01:00, 09:30, 11:00"
                      style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '15px', fontWeight: 600, textAlign: 'center', color: '#1e293b' }}
                    />
                    <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#fff' }}>
                      <button
                        type="button"
                        onClick={() => setEndAmPm('AM')}
                        style={{
                          padding: '0 16px',
                          height: '38px',
                          border: 0,
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: endAmPm === 'AM' ? '#e11d48' : '#fff',
                          color: endAmPm === 'AM' ? '#fff' : '#64748b'
                        }}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndAmPm('PM')}
                        style={{
                          padding: '0 16px',
                          height: '38px',
                          border: 0,
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: endAmPm === 'PM' ? '#e11d48' : '#fff',
                          color: endAmPm === 'PM' ? '#fff' : '#64748b'
                        }}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {endDate && (
                  <div style={{ fontSize: '11px', color: '#047857', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
                    {formatScheduleDisplay(endDate, endTime, endAmPm)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="org-tickets-builder" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Quick Preset Selector Bar */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Ticket size={18} color="#e11d48" /> Ticket Types &amp; Pricing
                  </h4>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Click any preset button below to add or fix ticket types (VIP, General, VVIP, etc.)
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Quick Add:</span>
                  {TICKET_PRESETS.map(preset => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => addTicketTier(preset.key)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: `1.5px solid ${preset.border}`,
                        background: preset.bg,
                        color: preset.color,
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Add a new ${preset.name} tier`}
                    >
                      <span>{preset.icon}</span>
                      <span>+ {preset.label.split('/')[0].trim()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Informative Hint */}
              <div style={{ fontSize: '12px', color: '#475569', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span>💡 You can offer multiple ticket types (VIP, General, VVIP) with separate prices and capacities.</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {tickets.length} {tickets.length === 1 ? 'Tier' : 'Tiers'} Configured · Total Capacity: {tickets.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0)}
                </span>
              </div>
            </div>

            {/* List of Ticket Tiers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tickets.map((ticket, index) => {
                const currentPreset = TICKET_PRESETS.find(p => p.key === ticket.tierKey) || TICKET_PRESETS[0];
                return (
                  <div
                    key={ticket.id}
                    style={{
                      background: '#fff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    {/* Tier Header with Select Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: currentPreset.bg,
                          color: currentPreset.color,
                          border: `1.5px solid ${currentPreset.border}`,
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          {currentPreset.icon} Tier #{index + 1}: {ticket.name || 'Unnamed Tier'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                          Fix Type:
                        </span>
                      </div>

                      {/* Select Buttons to Fix/Switch this Ticket's Tier */}
                      <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {TICKET_PRESETS.map(preset => {
                          const isSelected = ticket.tierKey === preset.key;
                          return (
                            <button
                              key={preset.key}
                              type="button"
                              onClick={() => applyPresetToTicket(ticket.id, preset.key)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 12px',
                                borderRadius: '7px',
                                border: isSelected ? `2px solid ${preset.color}` : '1px solid #cbd5e1',
                                background: isSelected ? preset.bg : '#fff',
                                color: isSelected ? preset.color : '#475569',
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{preset.icon}</span>
                              <span>{preset.label.split('/')[0].trim()}</span>
                              {isSelected && <span style={{ marginLeft: '3px', fontWeight: 900 }}>✓</span>}
                            </button>
                          );
                        })}

                        {tickets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicketTier(ticket.id)}
                            style={{
                              marginLeft: '8px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #fecdd3',
                              background: '#fff1f2',
                              color: '#e11d48',
                              fontWeight: 600,
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title="Remove this ticket tier"
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inputs Grid */}
                    <div className="org-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, fontSize: '12px', color: '#334155' }}>
                        <span>Ticket Name <em>*</em></span>
                        <input
                          type="text"
                          value={ticket.name}
                          onChange={(e) => updateTicket(ticket.id, 'name', e.target.value)}
                          placeholder="e.g. VIP Pass, General Admission"
                          required
                          style={{
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            color: '#0f172a'
                          }}
                        />
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, fontSize: '12px', color: '#334155' }}>
                        <span>Price (INR) <em>*</em></span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '12px', color: '#64748b', fontWeight: 700, fontSize: '14px' }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            value={ticket.price}
                            onChange={(e) => updateTicket(ticket.id, 'price', e.target.value)}
                            placeholder="0"
                            required
                            style={{
                              width: '100%',
                              height: '42px',
                              padding: '0 12px 0 28px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '14px',
                              color: '#0f172a',
                              fontWeight: 600
                            }}
                          />
                        </div>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 600, fontSize: '12px', color: '#334155' }}>
                        <span>Capacity (Tickets) <em>*</em></span>
                        <input
                          type="number"
                          min="1"
                          value={ticket.capacity}
                          onChange={(e) => updateTicket(ticket.id, 'capacity', e.target.value)}
                          placeholder="100"
                          required
                          style={{
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            color: '#0f172a',
                            fontWeight: 600
                          }}
                        />
                      </label>
                    </div>

                    {/* Tier Perk Note */}
                    {currentPreset.perk && (
                      <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{currentPreset.icon}</span>
                        <span><em>Suggestion:</em> {currentPreset.perk}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Tier Button Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: '#fdf4f5', border: '1px dashed #f43f5e', borderRadius: '12px', padding: '14px 18px' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Need more ticket categories?</span>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>Add VIP, VVIP, or General tiers so your attendees have options.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => addTicketTier('vip')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #d97706',
                    background: '#fffbeb',
                    color: '#b45309',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  👑 + Add VIP Ticket
                </button>
                <button
                  type="button"
                  onClick={() => addTicketTier('vvip')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #be185d',
                    background: '#fdf2f8',
                    color: '#9d174d',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  💎 + Add VVIP Ticket
                </button>
                <button
                  type="button"
                  onClick={() => addTicketTier('general')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #0284c7',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⭐ + Add General Ticket
                </button>
              </div>
            </div>
          </div>
        ) : step === 3 ? <div className="event-media-field"><div className="media-mode"><button type="button" className={imageMode === 'upload' ? 'active' : ''} onClick={() => setImageMode('upload')}>Upload image</button><button type="button" className={imageMode === 'url' ? 'active' : ''} onClick={() => setImageMode('url')}>Use image URL</button></div>{imageMode === 'upload' ? <label className={`event-upload ${uploadingImage ? 'uploading' : ''}`}><Image/><b>{uploadingImage ? 'Uploading to Cloudinary…' : 'Choose event banner'}</b><span>JPG, PNG or WebP · maximum 3 MB</span><input disabled={uploadingImage} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage}/></label> : <label>Public image URL<input type="url" value={form.image} onChange={update("image")} placeholder="https://example.com/event-banner.jpg"/></label>}{imageMode === 'upload' && imageUpload.status !== 'idle' && <div className={`image-upload-status ${imageUpload.status}`} role="status">{imageUpload.status === 'uploading' && <i/>}{imageUpload.status === 'success' && <Check/>}<span><b>{imageUpload.status === 'uploading' ? 'Uploading image…' : imageUpload.status === 'success' ? 'Uploaded successfully to Cloudinary' : 'Upload failed'}</b><small>{imageUpload.status === 'error' ? imageUpload.error : imageUpload.fileName}</small></span></div>}{form.image && <div className="event-image-preview"><img src={form.image} alt="Event banner preview"/><button type="button" onClick={() => { setForm(current => ({ ...current, image:'' })); setImageUpload({ status:'idle', fileName:'', error:'' }); }}>Remove image</button></div>}</div> : <div className="org-step-placeholder"><Check/><h3>Ready for approval</h3><p>Submitting sends this event to the Admin workspace. Customers see it only after approval.</p></div>}
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
