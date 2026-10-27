import React from 'react';
import {
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
  Eye,
  X,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';
import { apiRequest } from '../services/apiClient.js';

const title = item => item.title || item.name || item.details?.organizationName || item.applicant?.name || 'Submitted record';
const statusLabel = value => String(value || '').replaceAll('_', ' ');

export default function AdminPortalPage() {
  const [data, setData] = React.useState({ users: [], applications: [], events: [], venues: [], logs: [] });
  const [busy, setBusy] = React.useState(true);
  const [reviewing, setReviewing] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [modalError, setModalError] = React.useState('');
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [feedback, setFeedback] = React.useState('');

  const closeModal = React.useCallback(() => {
    setSelectedRecord(null);
    setFeedback('');
    setModalError('');
  }, []);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const [users, applications, events, venues, logs] = await Promise.all(
        ['/admin/users', '/admin/applications', '/organizer/events', '/venue-owner/venues', '/admin/audit-logs'].map(path => apiRequest(path))
      );
      setData({
        users: users.items || [],
        applications: applications.items || [],
        events: events.items || [],
        venues: venues.items || [],
        logs: logs.items || []
      });
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeModal]);

  const approvals = [
    ['Applications', data.applications],
    ['Events', data.events],
    ['Venues', data.venues]
  ].flatMap(([type, items]) =>
    items
      .filter(item => ['pending', 'pending_review'].includes(item.status))
      .map(item => ({ type, item }))
  );

  const review = async (record, decision, customFeedback = '') => {
    const { type, item } = record;
    setReviewing(item._id);
    setModalError('');
    setError('');
    setMessage('');
    try {
      await apiRequest(`/admin/${type.toLowerCase()}/${item._id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, feedback: customFeedback || undefined })
      });
      const actionText = decision === 'approved' ? 'authorized and approved' : 'rejected';
      setMessage(`${title(item)} was successfully ${actionText}.`);
      closeModal();
      await load();
    } catch (requestError) {
      const msg = requestError.message || 'Action failed. Please try again.';
      setModalError(msg);
      setError(msg);
    } finally {
      setReviewing('');
    }
  };

  const openModal = record => {
    setSelectedRecord(record);
    setFeedback('');
    setModalError('');
  };

  return (
    <div className="admin-console">
      {/* Platform Summary Cards */}
      <section className="admin-summary">
        <article>
          <Users />
          <span>
            <b>{data.users.length}</b>
            <small>Users</small>
          </span>
        </article>
        <article>
          <ShieldCheck />
          <span>
            <b>{approvals.length}</b>
            <small>Pending approvals</small>
          </span>
        </article>
        <article>
          <CheckCircle2 />
          <span>
            <b>{data.events.filter(item => item.status === 'published').length}</b>
            <small>Published events</small>
          </span>
        </article>
        <article>
          <RefreshCw />
          <span>
            <b>{data.logs.length}</b>
            <small>Audit records</small>
          </span>
        </article>
      </section>

      {error && (
        <p className="role-error" role="alert">
          <AlertCircle size={18} /> {error}
        </p>
      )}
      {message && (
        <p className="role-success">
          <CheckCircle2 size={18} /> {message}
        </p>
      )}

      {/* Pending Approvals Review Queue */}
      <section className="admin-approvals">
        <header>
          <div>
            <p>REVIEW QUEUE</p>
            <h2>Pending approvals</h2>
            <small>Review organizer applications, events, and venues. Inspect details before authorizing.</small>
          </div>
          <button disabled={busy} onClick={load} className="admin-refresh-btn">
            <RefreshCw size={16} className={busy ? 'admin-spin' : ''} /> {busy ? 'Loading…' : 'Refresh'}
          </button>
        </header>

        {approvals.length ? (
          <div className="approval-grid">
            {approvals.map(record => {
              const { type, item } = record;
              const hasImage = Boolean(item.images?.[0]);
              const isApplication = type === 'Applications';
              const orgName = item.details?.organizationName;
              const applicantName = item.applicant?.name;
              const applicantEmail = item.applicant?.email;

              return (
                <article key={`${type}-${item._id}`} className={`approval-card ${hasImage ? 'has-image' : 'no-image'}`}>
                  {hasImage && <img src={item.images[0]} alt={title(item)} className="approval-card-img" />}
                  <div className="approval-copy">
                    <div className="approval-copy-header">
                      <span className="approval-type">
                        {isApplication ? `${item.type || 'organizer'} application` : type.replace(/s$/, '')}
                      </span>
                      <span className="approval-status-pill">{statusLabel(item.status)}</span>
                    </div>

                    <h3 className="approval-card-title" onClick={() => openModal(record)} title="Click to check full details">
                      {isApplication && orgName ? orgName : title(item)}
                    </h3>

                    {isApplication && applicantName && (
                      <p className="approval-applicant-line">
                        <strong>Applicant:</strong> {applicantName} {applicantEmail ? `(${applicantEmail})` : ''}
                      </p>
                    )}

                    {isApplication && (item.details?.eventCategory || item.details?.plannedEventTitle) && (
                      <div style={{ margin: '0.4rem 0', padding: '0.4rem 0.65rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.82rem', border: '1px solid #bfdbfe', color: '#1e40af' }}>
                        <strong>🎯 Proposed Event:</strong> {item.details?.eventCategory} {item.details?.eventSubcategory ? `(${item.details.eventSubcategory})` : ''} {item.details?.plannedEventTitle ? `— "${item.details.plannedEventTitle}"` : ''}
                      </div>
                    )}

                    <p className="approval-card-desc">
                      {item.details?.description || item.description || 'Waiting for administrator review.'}
                    </p>

                    <dl className="approval-card-meta">
                      {item.startsAt && (
                        <div>
                          <dt>Date</dt>
                          <dd>{new Date(item.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
                        </div>
                      )}
                      {item.category && (
                        <div>
                          <dt>Category</dt>
                          <dd>{item.category} · {item.subcategory}</dd>
                        </div>
                      )}
                      {(item.location?.city || item.details?.address) && (
                        <div>
                          <dt>Location</dt>
                          <dd>{item.venueName || item.location?.city || item.details?.address?.split(',')[0]}</dd>
                        </div>
                      )}
                      {item.details?.phone && (
                        <div>
                          <dt>Phone</dt>
                          <dd>{item.details.phone}</dd>
                        </div>
                      )}
                      {item.details?.website && (
                        <div>
                          <dt>Website</dt>
                          <dd>
                            <a href={item.details.website} target="_blank" rel="noreferrer" className="admin-inline-link">
                              Link <ExternalLink size={11} />
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="role-review-actions">
                      <button
                        type="button"
                        className="btn-check-details"
                        onClick={() => openModal(record)}
                        title="Inspect full details, credentials & authorize"
                      >
                        <Eye size={16} /> Check Details
                      </button>

                      <button
                        type="button"
                        className="btn-quick-approve"
                        disabled={reviewing === item._id}
                        onClick={() => review(record, 'approved')}
                        title="Approve & Authorize immediately"
                      >
                        <CheckCircle2 size={16} />
                        {reviewing === item._id ? 'Saving…' : 'Approve'}
                      </button>

                      <button
                        type="button"
                        className="btn-quick-reject"
                        disabled={reviewing === item._id}
                        onClick={() => review(record, 'rejected')}
                        title="Reject application"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="approval-empty">
            <CheckCircle2 size={36} />
            <h3>All caught up</h3>
            <p>No pending approvals are waiting right now.</p>
          </div>
        )}
      </section>

      {/* Recent Platform Records */}
      <section className="admin-records">
        <h2>Recent platform records</h2>
        <div>
          {[
            ['Users', data.users],
            ['Events', data.events],
            ['Venues', data.venues],
            ['Audit log', data.logs]
          ].map(([name, items]) => (
            <article key={name}>
              <header>
                <b>{name}</b>
                <span>{items.length}</span>
              </header>
              {items.slice(0, 6).map(item => (
                <p key={item._id || item.id}>
                  <span>
                    <b>{title(item)}</b>
                    <small>{statusLabel(item.status || item.action || item.email)}</small>
                  </span>
                  <CheckCircle2 size={16} />
                </p>
              ))}
              {!items.length && <small>No records yet.</small>}
            </article>
          ))}
        </div>
      </section>

      {/* Comprehensive Application & Item Detail Modal */}
      {selectedRecord && (
        <div className="admin-modal-backdrop" onClick={closeModal}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="admin-modal-header">
              <div>
                <span className="approval-type-pill">
                  {selectedRecord.type === 'Applications'
                    ? `${selectedRecord.item.type || 'organizer'} Application`
                    : `${selectedRecord.type.replace(/s$/, '')} Submission`}
                </span>
                <h2>{title(selectedRecord.item)}</h2>
                {selectedRecord.item.details?.organizationName && (
                  <p className="admin-modal-org">
                    <Building2 size={15} /> {selectedRecord.item.details.organizationName}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={closeModal}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </header>

            <div className="admin-modal-scroll-body">
              {/* If it has cover/banner image */}
              {selectedRecord.item.images?.[0] && (
                <div className="admin-modal-banner">
                  <img src={selectedRecord.item.images[0]} alt={title(selectedRecord.item)} />
                </div>
              )}

              {/* Application Details */}
              {selectedRecord.type === 'Applications' && (
                <div className="admin-detail-sections">
                  {/* Submitter details */}
                  <div className="admin-detail-card">
                    <h4>
                      <Users size={16} /> Applicant Information
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Full Name</span>
                        <strong>{selectedRecord.item.applicant?.name || 'Unknown'}</strong>
                      </div>
                      <div>
                        <span>Email Address</span>
                        <strong>
                          {selectedRecord.item.applicant?.email ? (
                            <a href={`mailto:${selectedRecord.item.applicant.email}`} className="admin-contact-link">
                              <Mail size={13} /> {selectedRecord.item.applicant.email}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Contact Phone</span>
                        <strong>
                          {selectedRecord.item.details?.phone ? (
                            <a href={`tel:${selectedRecord.item.details.phone}`} className="admin-contact-link">
                              <Phone size={13} /> {selectedRecord.item.details.phone}
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Current Platform Role</span>
                        <strong>{selectedRecord.item.applicant?.roles?.join(', ') || 'customer'}</strong>
                      </div>
                      <div>
                        <span>Account Status</span>
                        <strong className="admin-status-tag">
                          {selectedRecord.item.applicant?.status || 'active'}
                        </strong>
                      </div>
                      <div>
                        <span>Application Date</span>
                        <strong>
                          {selectedRecord.item.createdAt
                            ? new Date(selectedRecord.item.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })
                            : 'Recently'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Event & Category Info */}
                  <div className="admin-detail-card" style={{ borderLeft: '4px solid #2563eb', background: '#f8faff' }}>
                    <h4 style={{ color: '#1d4ed8' }}>
                      <CalendarDays size={16} /> Proposed Event & Specialization
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Event Category</span>
                        <strong>{selectedRecord.item.details?.eventCategory || 'Entertainment / General'}</strong>
                      </div>
                      <div>
                        <span>Subcategory / Genre</span>
                        <strong>{selectedRecord.item.details?.eventSubcategory || 'Standard'}</strong>
                      </div>
                      <div className="grid-full-width">
                        <span>Proposed Event Concept</span>
                        <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
                          {selectedRecord.item.details?.plannedEventTitle || selectedRecord.item.details?.organizationName || 'Not specified'}
                        </strong>
                      </div>
                      <div>
                        <span>Target City / Market</span>
                        <strong>{selectedRecord.item.details?.targetCity || selectedRecord.item.details?.address || 'Not specified'}</strong>
                      </div>
                      <div>
                        <span>Expected Audience Scale</span>
                        <strong>{selectedRecord.item.details?.expectedAttendees || '100 - 500 attendees'}</strong>
                      </div>
                      <div>
                        <span>Event Format</span>
                        <strong>{selectedRecord.item.details?.eventType || 'In-person live event'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Organization & Credentials */}
                  <div className="admin-detail-card">
                    <h4>
                      <Building2 size={16} /> Business & Legal Information
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Organization / Brand</span>
                        <strong>{selectedRecord.item.details?.organizationName || 'Not specified'}</strong>
                      </div>
                      <div>
                        <span>Website / Portfolio</span>
                        <strong>
                          {selectedRecord.item.details?.website ? (
                            <a
                              href={selectedRecord.item.details.website}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-contact-link"
                            >
                              {selectedRecord.item.details.website} <ExternalLink size={13} />
                            </a>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div className="grid-full-width">
                        <span>Registered Business Address</span>
                        <strong>
                          {selectedRecord.item.details?.address ? (
                            <span className="admin-address-row">
                              <MapPin size={14} /> {selectedRecord.item.details.address}
                            </span>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>PAN / GST Number</span>
                        <strong>{selectedRecord.item.details?.panGst || 'Not provided'}</strong>
                      </div>
                      <div>
                        <span>Payout / Bank Account</span>
                        <strong>
                          {selectedRecord.item.details?.bankAccount ? (
                            <span className="admin-bank-row">
                              <CreditCard size={14} /> {selectedRecord.item.details.bankAccount}
                            </span>
                          ) : (
                            'Not provided'
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Pitch / Bio Description */}
                  <div className="admin-detail-card">
                    <h4>
                      <FileText size={16} /> Organizer Proposal & Bio
                    </h4>
                    <div className="admin-detail-desc-box">
                      <p>{selectedRecord.item.details?.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  {/* Authorization Notice */}
                  <div className="admin-auth-notice">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Role Authorization on Approval:</strong>
                      <p>
                        Approving this application will immediately authorize{' '}
                        <b>{selectedRecord.item.applicant?.name}</b> with the{' '}
                        <b>
                          {selectedRecord.item.type === 'venue_owner' ? 'Venue Owner' : 'Event Organizer'}
                        </b>{' '}
                        role, allowing them to access management tools, submit events, and manage bookings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Details */}
              {selectedRecord.type === 'Events' && (
                <div className="admin-detail-sections">
                  <div className="admin-detail-card">
                    <h4>
                      <CalendarDays size={16} /> Event Details
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Category</span>
                        <strong>
                          {selectedRecord.item.category} · {selectedRecord.item.subcategory}
                        </strong>
                      </div>
                      <div>
                        <span>Starts At</span>
                        <strong>
                          {new Date(selectedRecord.item.startsAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </strong>
                      </div>
                      <div>
                        <span>Ends At</span>
                        <strong>
                          {new Date(selectedRecord.item.endsAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </strong>
                      </div>
                      <div>
                        <span>Location / Venue</span>
                        <strong>
                          {selectedRecord.item.venueName || selectedRecord.item.location?.city || 'TBD'}
                        </strong>
                      </div>
                      <div>
                        <span>Organizer</span>
                        <strong>
                          {selectedRecord.item.organizer?.name || 'Assigned organizer'}{' '}
                          {selectedRecord.item.organizer?.email ? `(${selectedRecord.item.organizer.email})` : ''}
                        </strong>
                      </div>
                      <div>
                        <span>Capacity</span>
                        <strong>{selectedRecord.item.capacity || 'Not limited'} attendees</strong>
                      </div>
                    </div>
                  </div>

                  {/* Ticket tiers */}
                  {selectedRecord.item.ticketTypes?.length > 0 && (
                    <div className="admin-detail-card">
                      <h4>
                        <CreditCard size={16} /> Ticket Pricing Tiers
                      </h4>
                      <div className="admin-ticket-list">
                        {selectedRecord.item.ticketTypes.map((tier, idx) => (
                          <div key={idx} className="admin-ticket-row">
                            <b>{tier.name}</b>
                            <span>₹{tier.price}</span>
                            <small>{tier.capacity} seats</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="admin-detail-card">
                    <h4>
                      <FileText size={16} /> Event Description
                    </h4>
                    <div className="admin-detail-desc-box">
                      <p>{selectedRecord.item.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Venue Details */}
              {selectedRecord.type === 'Venues' && (
                <div className="admin-detail-sections">
                  <div className="admin-detail-card">
                    <h4>
                      <Building2 size={16} /> Venue Details
                    </h4>
                    <div className="admin-detail-grid">
                      <div>
                        <span>Venue Type</span>
                        <strong>{selectedRecord.item.type}</strong>
                      </div>
                      <div>
                        <span>City / Address</span>
                        <strong>
                          {selectedRecord.item.location?.city || selectedRecord.item.city},{' '}
                          {selectedRecord.item.location?.address || selectedRecord.item.address}
                        </strong>
                      </div>
                      <div>
                        <span>Capacity</span>
                        <strong>{selectedRecord.item.capacity} guests</strong>
                      </div>
                      <div>
                        <span>Hourly Price</span>
                        <strong>₹{selectedRecord.item.priceMinorPerHour / 100} / hr</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>
                          {selectedRecord.item.owner?.name || 'Owner'}{' '}
                          {selectedRecord.item.owner?.email ? `(${selectedRecord.item.owner.email})` : ''}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {selectedRecord.item.amenities?.length > 0 && (
                    <div className="admin-detail-card">
                      <h4>Amenities & Facilities</h4>
                      <div className="admin-amenities-tags">
                        {selectedRecord.item.amenities.map(a => (
                          <span key={a} className="admin-amenity-tag">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="admin-detail-card">
                    <h4>
                      <FileText size={16} /> Venue Description
                    </h4>
                    <div className="admin-detail-desc-box">
                      <p>{selectedRecord.item.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Feedback Input */}
              <div className="admin-modal-feedback-card">
                <label htmlFor="admin-review-feedback">
                  <b>Reviewer Feedback / Decision Notes</b>
                  <small>Optional instructions or remarks that will be saved with this review.</small>
                </label>
                <textarea
                  id="admin-review-feedback"
                  rows={3}
                  placeholder="Enter any feedback, approval notes, or rejection reasoning here..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>

            </div>

            <footer className="admin-modal-footer">
              {modalError && (
                <div className="admin-modal-error" role="alert" style={{ width: '100%', marginBottom: 12 }}>
                  <AlertCircle size={18} />
                  <span>{modalError}</span>
                </div>
              )}
              <div className="admin-modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeModal();
                  }}
                  disabled={Boolean(reviewing)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-modal-reject"
                  disabled={Boolean(reviewing)}
                  onClick={(e) => {
                    e.stopPropagation();
                    review(selectedRecord, 'rejected', feedback);
                  }}
                >
                  {reviewing === selectedRecord.item._id ? (
                    <RefreshCw size={16} className="admin-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  {reviewing === selectedRecord.item._id ? 'Working…' : 'Reject'}
                </button>
                <button
                  type="button"
                  className="btn-modal-approve"
                  disabled={Boolean(reviewing)}
                  onClick={(e) => {
                    e.stopPropagation();
                    review(selectedRecord, 'approved', feedback);
                  }}
                >
                  {reviewing === selectedRecord.item._id ? (
                    <RefreshCw size={16} className="admin-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  {reviewing === selectedRecord.item._id ? 'Authorizing…' : 'Approve & Authorize'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
