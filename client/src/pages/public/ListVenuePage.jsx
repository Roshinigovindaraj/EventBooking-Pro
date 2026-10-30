import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  Headphones,
  Image,
  MapPin,
  Play,
  Settings,
  ShieldCheck,
  Star,
  Users,
  Edit3,
  X,
  Clock
} from "lucide-react";
import { Topbar } from "./CatalogPage.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import { apiRequest } from "../../services/apiClient.js";
import { useAuth } from "../../context/AuthContext.jsx";
import CelebrationPoppers from "../../components/CelebrationPoppers.jsx";

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
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const isVenueOwner = Boolean(user?.roles?.some(r => ['venue_owner', 'admin', 'super_admin'].includes(r)));
  const [application, setApplication] = React.useState(null);
  const [loadingApp, setLoadingApp] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [detailsConfirmed, setDetailsConfirmed] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [errorNotice, setErrorNotice] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [submittedVenue, setSubmittedVenue] = React.useState(null);
  const [featuredVenues, setFeaturedVenues] = React.useState([]);
  const [form, setForm] = React.useState({
    name: "",
    type: "",
    short: "",
    full: "",
    city: "",
    address: "",
    capacity: "300",
    amenities: "Parking, Wi-Fi",
    image: "",
    price: "25000",
    openingTime: "08:00",
    openingAmPm: "AM",
    closingTime: "11:00",
    closingAmPm: "PM",
    is24Hours: false,
    availableDays: "All Days (Mon - Sun)",
    minBookingHours: "4"
  });
  const [mediaMode, setMediaMode] = React.useState('upload');
  const [uploadingMedia, setUploadingMedia] = React.useState(false);
  const [mediaUpload, setMediaUpload] = React.useState({ status: 'idle', fileName: '', error: '' });

  // Load applicant's existing application if they are not yet a venue owner
  React.useEffect(() => {
    if (user && !isVenueOwner) {
      setLoadingApp(true);
      apiRequest('/venue-owner/applications/me')
        .then(res => {
          const app = res.items?.[0] || null;
          setApplication(app);
          if (app?.details && !form.name) {
            setForm(current => ({
              ...current,
              name: app.details.venueName || current.name,
              type: app.details.type || current.type,
              city: app.details.city || current.city,
              address: app.details.address || current.address,
              capacity: app.details.capacity ? String(app.details.capacity) : current.capacity,
              amenities: Array.isArray(app.details.amenities) ? app.details.amenities.join(', ') : (app.details.amenities || current.amenities),
              image: app.details.image || current.image,
              price: app.details.pricePerHour ? String(app.details.pricePerHour) : current.price,
              full: app.details.description || current.full,
              short: app.details.short || current.short || (app.details.description ? app.details.description.slice(0, 160) : ''),
              openingTime: app.details.openingTime || current.openingTime,
              openingAmPm: app.details.openingAmPm || current.openingAmPm,
              closingTime: app.details.closingTime || current.closingTime,
              closingAmPm: app.details.closingAmPm || current.closingAmPm,
              is24Hours: Boolean(app.details.is24Hours),
              availableDays: app.details.availableDays || current.availableDays,
              minBookingHours: app.details.minBookingHours ? String(app.details.minBookingHours) : current.minBookingHours
            }));
          }
        })
        .catch(() => null)
        .finally(() => setLoadingApp(false));
    }
  }, [user, isVenueOwner]);

  // Restore saved draft from localStorage if present
  React.useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('eventoria_venue_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        const { step: savedStep, ...formFields } = parsed;
        setForm(current => ({ ...current, ...formFields }));
        if (typeof savedStep === 'number' && savedStep >= 0 && savedStep <= 5) {
          setStep(savedStep);
        }
        setNotice('Restored your draft venue details.');
      }
    } catch {}
  }, []);

  // Continuously save draft & step
  React.useEffect(() => {
    try {
      localStorage.setItem('eventoria_venue_draft', JSON.stringify({ ...form, step }));
    } catch {}
  }, [form, step]);

  React.useEffect(() => {
    apiRequest('/venues').then(res => setFeaturedVenues((res.items || []).slice(0, 4))).catch(() => null);
  }, []);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const chooseMedia = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);
    if (!isImage && !isVideo) {
      return setMediaUpload({ status: 'error', fileName: file.name, error: 'Choose a valid image (JPG, PNG, WebP) or video (MP4, WebM).' });
    }
    const maxSizeBytes = isVideo ? 25 * 1024 * 1024 : 6 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return setMediaUpload({ status: 'error', fileName: file.name, error: `File too large. Maximum size is ${isVideo ? '25 MB for videos' : '6 MB for images'}.` });
    }
    setMediaUpload({ status: 'uploading', fileName: file.name, error: '' });
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await apiRequest('/uploads/media', {
          method: 'POST',
          body: JSON.stringify({ file: String(reader.result), folder: 'eventoria/venues' })
        });
        setForm(current => ({ ...current, image: result.media.url }));
        setMediaUpload({ status: 'success', fileName: file.name, error: '' });
      } catch (error) {
        setMediaUpload({ status: 'error', fileName: file.name, error: error.message || 'Upload failed' });
      } finally {
        setUploadingMedia(false);
        event.target.value = '';
      }
    };
    reader.onerror = () => {
      setMediaUpload({ status: 'error', fileName: file.name, error: 'Could not read file from device.' });
      setUploadingMedia(false);
    };
    reader.readAsDataURL(file);
  };

  const isVideoUrl = url => typeof url === 'string' && (/\.(mp4|webm|mov)(\?.*)?$/i.test(url) || url.includes('/video/upload/'));

  const handleNextStep = () => {
    setErrorNotice("");
    if (step === 0) {
      if (!form.name.trim()) return setErrorNotice('Venue name is required.');
      if (!form.type.trim()) return setErrorNotice('Please select a venue type.');
      const desc = (form.full || form.short || '').trim();
      if (desc.length < 5) return setErrorNotice('Please enter at least 5 characters in the description.');
    } else if (step === 1) {
      if (!form.city.trim()) return setErrorNotice('City is required.');
    } else if (step === 2) {
      if (!form.capacity || Number(form.capacity) <= 0) return setErrorNotice('Please enter a valid guest capacity.');
    } else if (step === 4) {
      if (!form.price || Number(form.price) < 0) return setErrorNotice('Please enter a valid price per hour.');
    }
    setStep(s => Math.min(s + 1, 5));
  };

  const saveVenue = async (submit) => {
    setSaving(true);
    setNotice("");
    setErrorNotice("");

    // 1. Validation checks
    if (!form.name.trim()) {
      setStep(0);
      setSaving(false);
      return setErrorNotice('Venue name is required.');
    }
    if (!form.type.trim()) {
      setStep(0);
      setSaving(false);
      return setErrorNotice('Please select a venue type.');
    }
    const description = (form.full || form.short || '').trim();
    if (description.length < 5) {
      setStep(0);
      setSaving(false);
      return setErrorNotice('Please enter a description for your venue.');
    }
    if (!form.city.trim()) {
      setStep(1);
      setSaving(false);
      return setErrorNotice('City is required.');
    }
    if (!form.capacity || Number(form.capacity) <= 0) {
      setStep(2);
      setSaving(false);
      return setErrorNotice('Please enter a valid guest capacity.');
    }
    if (!form.price || Number(form.price) < 0) {
      setStep(4);
      setSaving(false);
      return setErrorNotice('Please enter a valid price per hour.');
    }

    // 2. Authentication check
    if (!user) {
      try {
        localStorage.setItem('eventoria_venue_draft', JSON.stringify(form));
      } catch {}
      setSaving(false);
      return setErrorNotice('AUTH_REQUIRED');
    }

    // 3. For Customer accounts: Submit as a Venue Partner Application for Admin review
    if (!isVenueOwner) {
      try {
        const operatingHoursStr = form.is24Hours
          ? "Open 24 Hours"
          : `${form.openingTime || '08:00'} ${form.openingAmPm || 'AM'} – ${form.closingTime || '11:00'} ${form.closingAmPm || 'PM'}`;

        const details = {
          venueName: form.name.trim(),
          type: form.type,
          city: form.city.trim(),
          address: form.address?.trim() || '',
          capacity: Number(form.capacity),
          amenities: form.amenities.split(',').map(value => value.trim()).filter(Boolean),
          image: form.image || '',
          pricePerHour: Number(form.price),
          operatingHours: operatingHoursStr,
          openingTime: form.openingTime || '08:00',
          openingAmPm: form.openingAmPm || 'AM',
          closingTime: form.closingTime || '11:00',
          closingAmPm: form.closingAmPm || 'PM',
          is24Hours: Boolean(form.is24Hours),
          availableDays: form.availableDays || 'All Days (Mon - Sun)',
          minBookingHours: Number(form.minBookingHours) || 4,
          description,
          submittedAt: new Date().toISOString()
        };
        const isUpdating = Boolean(application && application.status === 'pending');
        const method = isUpdating ? 'PUT' : 'POST';
        const endpoint = isUpdating ? '/venue-owner/applications/pending' : '/venue-owner/applications';
        const result = await apiRequest(endpoint, {
          method,
          body: JSON.stringify({ details })
        });

        try { localStorage.removeItem('eventoria_venue_draft'); } catch {}

        setApplication(result.application);
        setSubmittedVenue({
          name: form.name.trim(),
          type: form.type,
          location: { city: form.city.trim(), address: form.address },
          capacity: Number(form.capacity),
          isApplication: true,
          status: 'pending'
        });
        setNotice(isUpdating ? 'Your Venue Owner application details were updated for Admin review.' : 'Venue Owner Partner Application submitted for Admin approval.');
        window.dispatchEvent(new Event('eventoria:data-changed'));
      } catch (error) {
        setErrorNotice(error.message || 'Could not submit partner application.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // 4. For Verified Venue Owners: Persist venue directly
    try {
      const result = await apiRequest('/venue-owner/venues', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description,
          type: form.type,
          city: form.city.trim(),
          address: form.address?.trim() || undefined,
          capacity: Number(form.capacity),
          amenities: form.amenities.split(',').map(value => value.trim()).filter(Boolean),
          images: form.image ? [form.image] : [],
          priceMinorPerHour: Math.round(Number(form.price) * 100),
          currency: 'INR',
          manualApproval: false,
          operatingHours: form.is24Hours ? "Open 24 Hours" : `${form.openingTime || '08:00'} ${form.openingAmPm || 'AM'} – ${form.closingTime || '11:00'} ${form.closingAmPm || 'PM'}`,
          availableDays: form.availableDays || 'All Days (Mon - Sun)',
          minBookingHours: Number(form.minBookingHours) || 4
        })
      });

      // Clear local draft cache
      try { localStorage.removeItem('eventoria_venue_draft'); } catch {}

      if (submit) {
        await apiRequest(`/venue-owner/venues/${result.venue._id}/submit`, { method: 'POST' });
        setSubmittedVenue(result.venue);
      } else {
        setNotice('Venue draft saved in your Venue Owner workspace.');
      }
      window.dispatchEvent(new Event('eventoria:data-changed'));
    } catch (error) {
      if (error.status === 401) {
        try { localStorage.setItem('eventoria_venue_draft', JSON.stringify(form)); } catch {}
        setErrorNotice('AUTH_REQUIRED');
      } else {
        setErrorNotice(error.message || 'Could not save venue. Please check the details and retry.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="org-page lv-page">
      <Topbar active="list"/>
      <section className="org-hero lv-hero">
        <div className="org-hero-copy">
          <p className="org-kicker">— &nbsp; LIST YOUR VENUE &nbsp; —</p>
          <h1>Turn Your Space into<br/>Unforgettable <em>Events</em></h1>
          <p className="org-intro">List your venue on Eventoria and connect with thousands of event organizers looking for the perfect space. Showcase your venue, get more bookings, and grow your business with zero hassle.</p>
          <div className="org-benefits">
            <span><Users/><b>Reach<br/>More Customers</b></span>
            <span><ShieldCheck/><b>Get Verified<br/>Listing</b></span>
            <span><Settings/><b>Flexible<br/>Pricing</b></span>
            <span><Headphones/><b>Dedicated<br/>Partner Support</b></span>
          </div>
          <div className="org-hero-actions">
            <button onClick={() => document.querySelector('.lv-builder')?.scrollIntoView({behavior:'smooth'})}>List Your Venue <ArrowRight/></button>
            <button className="org-watch"><i><Play fill="currentColor"/></i><b>Watch<br/>How It Works</b></button>
          </div>
        </div>
        <div className="org-hero-image">
          <div>
            <span>Weddings</span><span>Corporate Events</span><span>Birthday Parties</span><span>Social Gatherings</span><span>Conferences</span><span>Exhibitions</span>
          </div>
        </div>
      </section>

      <section className="org-quick">
        <p className="org-kicker">GET STARTED IN MINUTES</p>
        <h2>List Your Venue in <em>4 Simple Steps</em></h2>
        <div>
          {[
            ["Add Venue Details","Basic information about your venue",FileText],
            ["Upload Photos","Showcase your space with images",Image],
            ["Set Pricing & Amenities","Add amenities, pricing and policies",Settings],
            ["Submit for Verification","Our team will verify your venue",ShieldCheck]
          ].map(([title,text,Icon],index)=>(
            <React.Fragment key={title}>
              <article>
                <b>{index+1}</b><i><Icon/></i><h3>{title}</h3><p>{text}</p>
              </article>
              {index<3&&<ArrowRight className="org-step-arrow"/>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {user && !isVenueOwner && application?.status === 'pending' && (
        <div style={{ maxWidth: 1180, margin: '0 auto 28px', padding: '16px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AlertCircle size={26} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', fontSize: 15, color: '#92400e' }}>Venue Owner Application Under Admin Review</strong>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#b45309' }}>
                Your partner proposal for <b>{application.details?.venueName || 'your venue'}</b> is awaiting review from Platform Admins. Once approved, you will gain full Venue Owner access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (refreshUser) await refreshUser().catch(() => null);
              const res = await apiRequest('/venue-owner/applications/me').catch(() => null);
              if (res?.items?.[0]) setApplication(res.items[0]);
            }}
            style={{ padding: '8px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Check Status
          </button>
        </div>
      )}

      {user && !isVenueOwner && !application && (
        <div style={{ maxWidth: 1180, margin: '0 auto 28px', padding: '14px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <ShieldCheck size={24} style={{ color: '#2563eb', flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', fontSize: 14, color: '#1e40af' }}>Venue Partner Program</strong>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1d4ed8' }}>
              Logged in as <b>Customer</b>. Submitting this form forwards your venue proposal to Platform Administrators as a <b>Partner Application</b>. Once approved by an Admin, your account is upgraded to <b>Venue Owner</b> with access to manage bookings and direct <b>Venue Staff</b>.
            </p>
          </div>
        </div>
      )}

      <section className="org-builder lv-builder">
        <aside style={{ overflowY: 'auto' }}>
          {formSteps.map(([title,text,Icon],index)=>(
            <button
              className={step===index && !submittedVenue ? 'active' : ''}
              onClick={()=>{ setStep(index); setSubmittedVenue(null); }}
              key={title}
              style={{ height: 'auto', minHeight: '64px', padding: '12px 18px' }}
            >
              <b>{index+1}</b><span><strong>{title}</strong><small>{text}</small></span><Icon/>
            </button>
          ))}
        </aside>

        {submittedVenue ? (
          <div className="venue-success-screen" style={{ position: "relative", overflow: "visible" }}>
            <CelebrationPoppers top="14px" left="-18px" right="-18px" />
            <div className="venue-success-icon">
              <CheckCircle2 size={44} />
            </div>
            <h2>{submittedVenue.isApplication ? 'Venue Partner Application Submitted!' : 'Venue Submitted for Verification!'}</h2>
            <p>
              {submittedVenue.isApplication ? (
                <>Your application to become a verified <strong>Venue Owner</strong> for <strong>{submittedVenue.name || form.name}</strong> has been submitted to Platform Administrators. Once approved by an Admin, your account will be granted the <strong>Venue Owner</strong> role to manage bookings and dispatch <strong>Venue Staff</strong>.</>
              ) : (
                <>Your venue <strong>{submittedVenue.name || form.name}</strong> has been successfully submitted and forwarded to the Admin workspace. Once verified by our team, it will appear publicly for event organizers.</>
              )}
            </p>
            <div className="venue-success-meta">
              <div><span>City</span><b>{submittedVenue.location?.city || form.city}</b></div>
              <div><span>Capacity</span><b>{submittedVenue.capacity || form.capacity} Guests</b></div>
              <div><span>Hourly Rate</span><b>₹{form.price} / hr</b></div>
              <div><span>Status</span><b style={{ color: '#b26a00' }}>Pending Admin Review</b></div>
            </div>
            <div className="venue-success-actions">
              {isVenueOwner ? (
                <Link to="/portal/venue-owner" className="btn-success-primary">
                  <Building2 size={16} /> Go to Venue Owner Portal
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn-success-primary"
                  onClick={async () => {
                    if (refreshUser) await refreshUser().catch(() => null);
                    navigate('/dashboard');
                  }}
                >
                  <Building2 size={16} /> Go to Dashboard
                </button>
              )}
              <Link to="/venues" className="btn-success-secondary">
                Browse Venues
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmittedVenue(null);
                  setStep(0);
                  setNotice("");
                  setErrorNotice("");
                }}
                className="btn-success-text"
              >
                {submittedVenue.isApplication ? 'Edit Submitted Details' : 'List Another Venue'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(event)=>{
            event.preventDefault();
            if (step < 5) {
              handleNextStep();
            } else {
              setShowConfirmModal(true);
            }
          }}>
            <h2>{formSteps[step][0]}</h2>
            <p>Tell us about your venue. This information will be visible to event organizers.</p>

            {step===0 ? (
              <>
                <div className="org-form-grid">
                  <label>Venue Name <em>*</em><input value={form.name} onChange={update('name')} placeholder="Enter venue name" required/></label>
                  <label>Venue Type <em>*</em><select value={form.type} onChange={update('type')} required><option value="">Select venue type</option>{types.map(type=><option key={type}>{type}</option>)}</select></label>
                </div>
                <label>Short Description <em>*</em><textarea value={form.short} maxLength="200" onChange={update('short')} required placeholder="A brief summary of your venue (max 200 characters)"/></label>
                <label>Full Description <em>*</em><textarea className="lv-full" value={form.full} maxLength="1000" onChange={update('full')} required placeholder="Detailed information about space, amenities, parking, and rules (max 1000 characters)"/></label>
              </>
            ) : step===1 ? (
              <div className="org-form-grid">
                <label>City <em>*</em><input value={form.city} onChange={update('city')} placeholder="e.g. Chennai, Bangalore" required/></label>
                <label>Address<input value={form.address} onChange={update('address')} placeholder="e.g. 100 Feet Road, Indiranagar"/></label>
              </div>
            ) : step===2 ? (
              <div className="org-form-grid">
                <label>Capacity (guests) <em>*</em><input type="number" min="1" value={form.capacity} onChange={update('capacity')} required/></label>
                <label>Amenities (comma separated)<input value={form.amenities} onChange={update('amenities')} placeholder="Parking, Wi-Fi, Air Conditioning, Sound System"/></label>
              </div>
            ) : step===3 ? (
              <div className="event-media-field">
                <div className="media-mode">
                  <button
                    type="button"
                    className={mediaMode === 'upload' ? 'active' : ''}
                    onClick={() => setMediaMode('upload')}
                  >
                    Upload Photos & Videos
                  </button>
                  <button
                    type="button"
                    className={mediaMode === 'url' ? 'active' : ''}
                    onClick={() => setMediaMode('url')}
                  >
                    Use Media URL
                  </button>
                </div>

                {mediaMode === 'upload' ? (
                  <label className={`event-upload ${uploadingMedia ? 'uploading' : ''}`}>
                    <Image />
                    <b>{uploadingMedia ? 'Uploading to Cloudinary…' : 'Choose venue photo or video'}</b>
                    <span>Images (JPG, PNG, WebP up to 6 MB) or Videos (MP4, WebM up to 25 MB)</span>
                    <input
                      disabled={uploadingMedia}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                      onChange={chooseMedia}
                    />
                  </label>
                ) : (
                  <label>
                    Venue Image or Video URL (Cloudinary or Direct Link)
                    <input
                      type="url"
                      value={form.image}
                      onChange={update('image')}
                      placeholder="https://res.cloudinary.com/... or https://..."
                    />
                  </label>
                )}

                {mediaMode === 'upload' && mediaUpload.status !== 'idle' && (
                  <div className={`image-upload-status ${mediaUpload.status}`} role="status">
                    {mediaUpload.status === 'uploading' && <i />}
                    {mediaUpload.status === 'success' && <Check />}
                    <span>
                      <b>
                        {mediaUpload.status === 'uploading'
                          ? 'Uploading to Cloudinary…'
                          : mediaUpload.status === 'success'
                          ? 'Uploaded successfully to Cloudinary'
                          : 'Upload failed'}
                      </b>
                      <small>{mediaUpload.status === 'error' ? mediaUpload.error : mediaUpload.fileName}</small>
                    </span>
                  </div>
                )}

                {form.image && (
                  <div className="event-image-preview">
                    {isVideoUrl(form.image) ? (
                      <video src={form.image} controls autoPlay muted loop />
                    ) : (
                      <img src={form.image} alt="Venue preview" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setForm(current => ({ ...current, image: '' }));
                        setMediaUpload({ status: 'idle', fileName: '', error: '' });
                      }}
                    >
                      Remove media
                    </button>
                  </div>
                )}
              </div>
            ) : step===4 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* 1. Hourly Pricing */}
                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={18} color="#e11d48" /> Hourly Rental Pricing
                  </h4>
                  <div className="org-form-grid" style={{ marginBottom: 0 }}>
                    <label>
                      <span>Price Per Hour (INR) <em>*</em></span>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '14px', fontWeight: 700, color: '#64748b' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          value={form.price}
                          onChange={update('price')}
                          placeholder="e.g. 15000"
                          required
                          style={{ paddingLeft: '32px' }}
                        />
                      </div>
                    </label>
                    <label>
                      <span>Minimum Booking Duration <em>*</em></span>
                      <select value={form.minBookingHours || '4'} onChange={update('minBookingHours')}>
                        <option value="1">1 Hour Minimum</option>
                        <option value="2">2 Hours Minimum</option>
                        <option value="4">4 Hours Minimum (Standard)</option>
                        <option value="6">6 Hours Minimum</option>
                        <option value="8">8 Hours (Full Day Event)</option>
                      </select>
                    </label>
                  </div>

                  <div style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                    <span>Estimated 8-Hour Full-Day Booking: <b style={{ color: '#16a34a' }}>₹{((Number(form.price) || 0) * 8).toLocaleString('en-IN')}</b></span>
                    <span style={{ color: '#64748b' }}>Charges apply per hour based on event start &amp; end times.</span>
                  </div>
                </div>

                {/* 2. Operating Hours & Daily Timings */}
                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="#e11d48" /> Venue Operating Hours &amp; Available Timings
                      </h4>
                      <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                        Set when event organizers can book and use your venue daily.
                      </p>
                    </div>
                    <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#fff' }}>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, is24Hours: false }))}
                        style={{
                          padding: '8px 14px',
                          border: 0,
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: !form.is24Hours ? '#e11d48' : '#fff',
                          color: !form.is24Hours ? '#fff' : '#64748b'
                        }}
                      >
                        🕒 Specific Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, is24Hours: true }))}
                        style={{
                          padding: '8px 14px',
                          border: 0,
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: form.is24Hours ? '#e11d48' : '#fff',
                          color: form.is24Hours ? '#fff' : '#64748b'
                        }}
                      >
                        ⚡ Open 24/7
                      </button>
                    </div>
                  </div>

                  {!form.is24Hours ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      {/* Opening Time Box */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          Opening Time (Start of Day)
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="08:00"
                            maxLength={5}
                            value={form.openingTime || '08:00'}
                            onChange={(e) => setForm(f => ({ ...f, openingTime: e.target.value.replace(/[^0-9:]/g, '') }))}
                            style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '15px', fontWeight: 700, textAlign: 'center', color: '#1e293b' }}
                          />
                          <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#fff' }}>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, openingAmPm: 'AM' }))}
                              style={{
                                padding: '0 14px',
                                height: '38px',
                                border: 0,
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: (form.openingAmPm || 'AM') === 'AM' ? '#e11d48' : '#fff',
                                color: (form.openingAmPm || 'AM') === 'AM' ? '#fff' : '#64748b'
                              }}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, openingAmPm: 'PM' }))}
                              style={{
                                padding: '0 14px',
                                height: '38px',
                                border: 0,
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: (form.openingAmPm || 'AM') === 'PM' ? '#e11d48' : '#fff',
                                color: (form.openingAmPm || 'AM') === 'PM' ? '#fff' : '#64748b'
                              }}
                            >
                              PM
                            </button>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>e.g. 06:00 AM, 08:00 AM, 09:30 AM</span>
                      </div>

                      {/* Closing Time Box */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          Closing Time (End of Day)
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="11:00"
                            maxLength={5}
                            value={form.closingTime || '11:00'}
                            onChange={(e) => setForm(f => ({ ...f, closingTime: e.target.value.replace(/[^0-9:]/g, '') }))}
                            style={{ flex: 1, height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '15px', fontWeight: 700, textAlign: 'center', color: '#1e293b' }}
                          />
                          <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #cbd5e1', background: '#fff' }}>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, closingAmPm: 'AM' }))}
                              style={{
                                padding: '0 14px',
                                height: '38px',
                                border: 0,
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: (form.closingAmPm || 'PM') === 'AM' ? '#e11d48' : '#fff',
                                color: (form.closingAmPm || 'PM') === 'AM' ? '#fff' : '#64748b'
                              }}
                            >
                              AM
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, closingAmPm: 'PM' }))}
                              style={{
                                padding: '0 14px',
                                height: '38px',
                                border: 0,
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: (form.closingAmPm || 'PM') === 'PM' ? '#e11d48' : '#fff',
                                color: (form.closingAmPm || 'PM') === 'PM' ? '#fff' : '#64748b'
                              }}
                            >
                              PM
                            </button>
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>e.g. 10:00 PM, 11:00 PM, 11:59 PM</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={24} color="#16a34a" />
                      <div>
                        <b style={{ color: '#15803d', fontSize: '13px', display: 'block' }}>24 Hours Round-The-Clock Booking Active</b>
                        <span style={{ color: '#166534', fontSize: '12px' }}>Organizers can request bookings at any hour of the day or night.</span>
                      </div>
                    </div>
                  )}

                  {/* Available Days Selector */}
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Available Days of the Week
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        'All Days (Mon - Sun)',
                        'Monday - Saturday',
                        'Weekends Only (Sat - Sun)',
                        'Weekdays Only (Mon - Fri)'
                      ].map(daysOption => {
                        const isSelected = (form.availableDays || 'All Days (Mon - Sun)') === daysOption;
                        return (
                          <button
                            key={daysOption}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, availableDays: daysOption }))}
                            style={{
                              padding: '7px 14px',
                              borderRadius: '8px',
                              border: isSelected ? '1.5px solid #e11d48' : '1px solid #cbd5e1',
                              background: isSelected ? '#fff0f3' : '#fff',
                              color: isSelected ? '#e11d48' : '#475569',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isSelected ? '✓ ' : ''}{daysOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Selection Summary Badge */}
                  <div style={{ marginTop: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={16} />
                    <span>
                      Selected Schedule: <b>{form.is24Hours ? 'Open 24 Hours Daily' : `${form.openingTime || '08:00'} ${form.openingAmPm || 'AM'} – ${form.closingTime || '11:00'} ${form.closingAmPm || 'PM'}`}</b> ({form.availableDays || 'All Days (Mon - Sun)'})
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="venue-review-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Review Header Banner */}
                <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1.5px solid #cbd5e1', borderRadius: '16px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '6px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                        Final Step 6 of 6
                      </span>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px' }}>
                        🔍 Review &amp; Check Details
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      Please Check All Your Venue Details
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
                      Review your information below before submitting for verification. Click <b>Edit</b> on any section to modify.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={saving}
                    style={{
                      background: detailsConfirmed ? '#e11d48' : '#64748b',
                      color: '#fff',
                      border: 0,
                      padding: '11px 22px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: detailsConfirmed ? '0 4px 14px rgba(225, 29, 72, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>Check &amp; Submit Venue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* 1. Venue Basic Information */}
                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={17} color="#e11d48" /> 1. Venue Information
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>VENUE NAME</span>
                      <b style={{ color: '#0f172a', fontSize: '15px' }}>{form.name || 'Untitled Venue'}</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>VENUE TYPE</span>
                      <b style={{ color: '#0f172a' }}>{form.type || 'Not selected'}</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>SHORT SUMMARY</span>
                      <span style={{ color: '#334155' }}>{form.short || 'Not provided'}</span>
                    </div>
                  </div>
                  {form.full && (
                    <div style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>FULL DESCRIPTION</span>
                      <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                        {form.full}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Location */}
                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={17} color="#e11d48" /> 2. Location &amp; Address
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>CITY</span>
                      <b style={{ color: '#0f172a' }}>{form.city || 'Not specified'}</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>STREET ADDRESS / LANDMARK</span>
                      <b style={{ color: '#0f172a' }}>{form.address || 'No street address specified'}</b>
                    </div>
                  </div>
                </div>

                {/* 3. Venue Specifications & Amenities */}
                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={17} color="#e11d48" /> 3. Specifications &amp; Amenities
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>GUEST CAPACITY</span>
                      <b style={{ color: '#0f172a', fontSize: '15px' }}>{Number(form.capacity).toLocaleString('en-IN')} Guests</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>SUITABLE FOR</span>
                      <span style={{ color: '#334155' }}>Weddings, Conferences, Banquets, Social Events</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>AMENITIES INCLUDED</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(form.amenities || '').split(',').map(a => a.trim()).filter(Boolean).map(item => (
                        <span key={item} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                          ✓ {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Photos & Videos */}
                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Image size={17} color="#e11d48" /> 4. Showcase Media
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                  </div>
                  {form.image ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ width: '180px', height: '100px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                        {isVideoUrl(form.image) ? (
                          <video src={form.image} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={form.image} alt="Venue preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        <b style={{ color: '#047857', display: 'block', marginBottom: '2px' }}>
                          ✓ {isVideoUrl(form.image) ? 'Venue video attached' : 'Venue photo uploaded'}
                        </b>
                        <span style={{ wordBreak: 'break-all', color: '#64748b' }}>{form.image.slice(0, 75)}...</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px' }}>
                      No custom photo/video uploaded (optional). Default venue category visuals will be used.
                    </div>
                  )}
                </div>

                {/* 5. Pricing & Operating Timings */}
                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Settings size={17} color="#e11d48" /> 5. Pricing &amp; Operating Timings
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Edit3 size={13} /> Edit Timings &amp; Pricing
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>HOURLY RATE</span>
                      <b style={{ color: '#0f172a', fontSize: '16px' }}>₹{Number(form.price || 0).toLocaleString('en-IN')} / hour</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>OPERATING TIMINGS</span>
                      <b style={{ color: '#047857' }}>
                        {form.is24Hours ? 'Open 24 Hours (Round the Clock)' : `${form.openingTime || '08:00'} ${form.openingAmPm || 'AM'} – ${form.closingTime || '11:00'} ${form.closingAmPm || 'PM'}`}
                      </b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>AVAILABLE DAYS</span>
                      <b style={{ color: '#0f172a' }}>{form.availableDays || 'All Days (Mon - Sun)'}</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>MINIMUM BOOKING</span>
                      <b style={{ color: '#334155' }}>{form.minBookingHours || '4'} Hours Minimum</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'block' }}>ESTIMATED 8-HOUR DAY RATE</span>
                      <b style={{ color: '#16a34a', fontSize: '15px' }}>₹{(Number(form.price || 0) * 8).toLocaleString('en-IN')}</b>
                    </div>
                  </div>
                </div>

                {/* 6. Verification Checkbox */}
                <div style={{ background: detailsConfirmed ? '#ecfdf5' : '#fffbeb', border: `1.5px solid ${detailsConfirmed ? '#a7f3d0' : '#fde68a'}`, borderRadius: '14px', padding: '18px 22px', transition: 'all 0.2s ease' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={detailsConfirmed}
                      onChange={(e) => setDetailsConfirmed(e.target.checked)}
                      style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#16a34a', cursor: 'pointer' }}
                    />
                    <div>
                      <b style={{ color: detailsConfirmed ? '#065f46' : '#92400e', fontSize: '14px', display: 'block' }}>
                        ✓ I have checked all the venue details above and confirm they are accurate
                      </b>
                      <span style={{ fontSize: '12px', color: detailsConfirmed ? '#047857' : '#78350f', display: 'block', marginTop: '2px' }}>
                        I verify that the venue name, address location, guest capacity, pricing rate, and amenities are correct and ready for platform review.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {errorNotice === 'AUTH_REQUIRED' ? (
              <div className="venue-auth-prompt">
                <AlertCircle size={22} />
                <div>
                  <strong>Sign in to Save or Submit Your Venue</strong>
                  <p>Your venue details have been saved! Sign in or create an account to publish your venue or save drafts.</p>
                  <div className="venue-auth-actions">
                    <Link to="/auth/login" state={{ from: '/list-venue' }} className="btn-auth-primary">
                      Sign In
                    </Link>
                    <Link to="/auth/register" state={{ from: '/list-venue' }} className="btn-auth-secondary">
                      Create Account
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="org-form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="button" className="draft" disabled={saving} onClick={() => saveVenue(false)}>
                  {saving ? 'Saving…' : isVenueOwner ? 'Save as Draft' : 'Save Proposal Draft'}
                </button>
                {step > 0 && (
                  <button
                    type="button"
                    className="draft"
                    disabled={saving}
                    onClick={() => setStep(step - 1)}
                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}
                  >
                    ← Previous Step
                  </button>
                )}
              </div>
              <button
                disabled={saving}
                type="button"
                onClick={() => {
                  if (step < 5) {
                    handleNextStep();
                  } else {
                    setShowConfirmModal(true);
                  }
                }}
                style={step === 5 ? { background: '#e11d48', color: '#fff' } : {}}
              >
                {saving
                  ? 'Submitting…'
                  : step === 5
                  ? (isVenueOwner ? 'Check & Submit Venue →' : 'Check & Submit Application →')
                  : 'Next Step'} <ArrowRight />
              </button>
            </div>

            {notice && (
              <div className="org-saved">
                <Check /> {notice}
                {isVenueOwner && (
                  <Link
                    to="/portal/venue-owner"
                    style={{ marginLeft: 14, textDecoration: 'underline', fontWeight: 700, color: '#097948' }}
                  >
                    Open Venue Owner Portal &rarr;
                  </Link>
                )}
              </div>
            )}
            {errorNotice && errorNotice !== 'AUTH_REQUIRED' && (
              <div className="org-saved error"><AlertCircle /> {errorNotice}</div>
            )}
          </form>
        )}
      </section>

      <section className="org-categories lv-types">
        <div>
          <p className="org-kicker">VENUE TYPES</p>
          <h2>List <em>Any Type</em><br/>of Venue</h2>
          <p>From elegant banquet halls to scenic outdoor spaces, Eventoria welcomes all types of venues.</p>
        </div>
        <div>
          {types.map((type,index)=>(
            <button key={type}><i>{["♜","▥","♨","♣","▧","♒","★"][index]}</i><b>{type}</b></button>
          ))}
        </div>
      </section>

      <section className="org-why">
        <div>
          <p className="org-kicker">WHY LIST WITH EVENTORIA?</p>
          <h2>Grow Your<br/>Venue <em>Business</em></h2>
          <p>Join thousands of venue owners who trust Eventoria to bring more events and revenue.</p>
        </div>
        {[
          [Users,"High Visibility","Reach thousands of event organizers"],
          [FileText,"Verified Listings","Build trust and get more bookings"],
          [Settings,"Easy Management","Manage availability, pricing and bookings"],
          [Headphones,"Dedicated Support","Our team is here to help you"]
        ].map(([Icon,title,text])=>(
          <article key={title}><i><Icon/></i><b>{title}</b><span>{text}</span></article>
        ))}
      </section>

      <section className="lv-featured">
        <header>
          <div>
            <p className="org-kicker">FEATURED VENUES ON EVENTORIA</p>
            <h2>Spaces That Inspire <em>Great Events</em></h2>
          </div>
          <a href="/venues">View All Venues <ArrowRight/></a>
        </header>
        {featuredVenues.length > 0 ? (
          <div>
            {featuredVenues.map((v) => (
              <article key={v._id || v.name}>
                <img src={v.images?.[0] || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=85'} alt={v.name}/>
                <h3>{v.name}</h3>
                <b><Star fill="currentColor"/> New</b>
                <p><MapPin/> {v.location?.city || v.city}, Tamil Nadu</p>
                <button onClick={() => window.location.href = '/venues'} aria-label={`View ${v.name}`}><ArrowRight/></button>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 20px', background: '#fff', borderRadius: '16px' }}>
            <p style={{ color: '#536078', margin: '0 0 14px' }}>Be the first verified venue owner to feature your property on Eventoria.</p>
            <button className="btn primary" onClick={()=>document.querySelector('.lv-builder')?.scrollIntoView({behavior:'smooth'})}>List Your Venue Now</button>
          </div>
        )}
      </section>

      <section className="org-cta">
        <div/>
        <section>
          <p className="org-kicker">READY TO LIST YOUR VENUE?</p>
          <h2>Start Getting <em>Bookings</em> Today</h2>
          <span>Join Eventoria and turn your venue into a hub for amazing events.</span>
          <button onClick={()=>document.querySelector('.lv-builder')?.scrollIntoView({behavior:'smooth'})}>List Your Venue <ArrowRight/></button>
        </section>
      </section>
      {/* One-Time Checking & Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="org-confirm-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowConfirmModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    One-Time Checking: Submit Venue?
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Final check of your details before submitting for verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowConfirmModal(false)}
                style={{ background: '#f1f5f9', border: 0, width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Venue Name:</span>
                <b style={{ color: '#0f172a', textAlign: 'right', fontSize: '14px' }}>{form.name || 'Untitled'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Venue Type:</span>
                <b style={{ color: '#0f172a' }}>{form.type || 'Not selected'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>City &amp; Address:</span>
                <b style={{ color: '#0f172a', textAlign: 'right' }}>{form.city}{form.address ? `, ${form.address}` : ''}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Guest Capacity:</span>
                <b style={{ color: '#047857' }}>{Number(form.capacity).toLocaleString('en-IN')} Guests</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Operating Timings:</span>
                <b style={{ color: '#047857', textAlign: 'right' }}>
                  {form.is24Hours ? 'Open 24 Hours' : `${form.openingTime || '08:00'} ${form.openingAmPm || 'AM'} – ${form.closingTime || '11:00'} ${form.closingAmPm || 'PM'}`} ({form.availableDays || 'All Days'})
                </b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Hourly Rate:</span>
                <b style={{ color: '#b45309' }}>₹{Number(form.price || 0).toLocaleString('en-IN')} / hour (Min {form.minBookingHours || '4'} hrs)</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Amenities:</span>
                <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>
                  {form.amenities || 'None specified'}
                </span>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '12px', color: '#065f46', lineHeight: 1.4 }}>
                Submitting will send this venue to Platform Administrators for verification. Once approved, your venue will appear publicly for event organizers to book.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '11px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ← Back to Review
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowConfirmModal(false);
                  saveVenue(true);
                }}
                style={{
                  background: '#e11d48',
                  color: '#ffffff',
                  border: 0,
                  padding: '11px 24px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
                }}
              >
                {saving ? 'Submitting…' : '✓ Yes, Confirm & Submit Venue'}
              </button>
            </div>
          </div>
        </div>
      )}
      <SiteFooter/>
    </div>
  );
}
