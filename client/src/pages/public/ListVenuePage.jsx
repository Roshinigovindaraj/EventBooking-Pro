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
  Users
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
    price: "25000"
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
              short: app.details.short || current.short || (app.details.description ? app.details.description.slice(0, 160) : '')
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
        setForm(current => ({ ...current, ...parsed }));
        setNotice('Restored your draft venue details.');
      }
    } catch {}
  }, []);

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
        const details = {
          venueName: form.name.trim(),
          type: form.type,
          city: form.city.trim(),
          address: form.address?.trim() || '',
          capacity: Number(form.capacity),
          amenities: form.amenities.split(',').map(value => value.trim()).filter(Boolean),
          image: form.image || '',
          pricePerHour: Number(form.price),
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
          manualApproval: false
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
        <aside>
          {formSteps.map(([title,text,Icon],index)=>(
            <button
              className={step===index && !submittedVenue ? 'active' : ''}
              onClick={()=>{ setStep(index); setSubmittedVenue(null); }}
              key={title}
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
          <form onSubmit={(event)=>{event.preventDefault();saveVenue(true)}}>
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
              <label>Price per hour (INR) <em>*</em><input type="number" min="0" value={form.price} onChange={update('price')} placeholder="e.g. 5000" required/></label>
            ) : (
              <div className="review-summary-box">
                <h3>
                  <span>Ready for Verification</span>
                  <small style={{ fontSize: 11, color: '#657086', fontWeight: 'normal' }}>Review your information before submitting</small>
                </h3>
                <div className="review-summary-grid">
                  <div className="review-item">
                    <span>Venue Name</span>
                    <b>{form.name || <small style={{ color: '#b01949' }}>Missing name</small>}</b>
                    <button type="button" className="btn-edit-step" onClick={() => setStep(0)}>Edit</button>
                  </div>
                  <div className="review-item">
                    <span>Venue Type</span>
                    <b>{form.type || <small style={{ color: '#b01949' }}>Not selected</small>}</b>
                    <button type="button" className="btn-edit-step" onClick={() => setStep(0)}>Edit</button>
                  </div>
                  <div className="review-item">
                    <span>Location</span>
                    <b>{form.city ? `${form.city}${form.address ? ', ' + form.address : ''}` : <small style={{ color: '#b01949' }}>City required</small>}</b>
                    <button type="button" className="btn-edit-step" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <div className="review-item">
                    <span>Guest Capacity</span>
                    <b>{form.capacity} Guests</b>
                    <button type="button" className="btn-edit-step" onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <div className="review-item">
                    <span>Rate / Hour</span>
                    <b>₹{form.price || 0} / hr</b>
                    <button type="button" className="btn-edit-step" onClick={() => setStep(4)}>Edit</button>
                  </div>
                  <div className="review-item">
                    <span>Media</span>
                    <b>{form.image ? (isVideoUrl(form.image) ? '1 Video attached' : '1 Photo attached') : 'No media'}</b>
                    <button type="button" className="btn-edit-step" onClick={() => setStep(3)}>Edit</button>
                  </div>
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

            <div className="org-form-actions">
              <button type="button" className="draft" disabled={saving} onClick={() => saveVenue(false)}>
                {saving ? 'Saving…' : isVenueOwner ? 'Save as Draft' : 'Save Proposal Draft'}
              </button>
              <button
                disabled={saving}
                type={step === 5 ? 'submit' : 'button'}
                onClick={() => {
                  if (step < 5) handleNextStep();
                }}
              >
                {saving
                  ? 'Submitting…'
                  : step === 5
                  ? (isVenueOwner ? 'Submit Venue' : 'Submit Partner Application')
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
      <SiteFooter/>
    </div>
  );
}
