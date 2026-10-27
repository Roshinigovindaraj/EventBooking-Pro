import React, { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";
import { Camera, Scan, User, Calendar, Ticket as TicketIcon, CheckCircle, XCircle, Clock, Users, ArrowRight } from "lucide-react";
import { Topbar } from "./public/CatalogPage.jsx";

export default function TicketScannerPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [credential, setCredential] = useState("");
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestedEventId = searchParams.get('eventId');

  const extractCredential = value => {
    if (!value) return '';
    const trimmed = String(value).trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.credential) return parsed.credential;
      if (parsed.ticketId) return parsed.ticketId;
      if (parsed.code) return parsed.code;
      if (parsed.bookingReference) return parsed.bookingReference;
    } catch { /* not JSON */ }
    try {
      const url = new URL(trimmed);
      const cred = url.searchParams.get('credential');
      if (cred) return cred;
    } catch { /* not a URL */ }
    return trimmed;
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);

  if (loading) return <p className="state-message">Loading…</p>;
  if (!user) return <Navigate to="/auth/login" replace/>;
  if (!user.roles?.some(role => ['event_staff','event_organizer','admin','super_admin'].includes(role))) return <Navigate to="/dashboard" replace/>;

  const handleScan = async (e, scannedCredential = credential) => {
    if (e?.preventDefault) e.preventDefault();
    const value = extractCredential(scannedCredential.trim());
    if (!value) return;
    setCredential(value);
    
    setScanning(true);
    setError("");
    setTicketData(null);
    
    try {
      const data = await apiRequest(`/tickets/verify?credential=${encodeURIComponent(value)}`);
      if (requestedEventId && data.event?.id !== requestedEventId) {
        throw new Error(`This ticket belongs to a different event ("${data.event?.title || 'Another Event'}"). Do not allow entry.`);
      }
      setTicketData(data);
    } catch (err) {
      setError(err.message || 'Ticket could not be verified');
    } finally {
      setScanning(false);
    }
  };

  const startCamera = async () => {
    setCameraError('');
    if (!('BarcodeDetector' in window)) {
      return setCameraError('Camera QR scanning is not supported by this browser. Enter the Booking ID or Ticket Code manually.');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      setCameraOn(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const scanFrame = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            const value = extractCredential(codes[0].rawValue);
            setCredential(value);
            stopCamera();
            handleScan({ preventDefault: () => {} }, value);
            return;
          }
        } catch { /* Continue scanning */ }
        window.setTimeout(scanFrame, 350);
      };
      scanFrame();
    } catch (cameraFailure) {
      stopCamera();
      setCameraError(cameraFailure.message || 'Camera permission was not granted.');
    }
  };

  const allowEntry = async (targetTicketId = null, checkAll = false) => {
    setAdmitting(true);
    setError('');
    try {
      const ticketIdToCheckIn = targetTicketId || ticketData.ticket?.id;
      const result = await apiRequest('/tickets/check-in', {
        method: 'POST',
        body: JSON.stringify({
          eventId: ticketData.event.id,
          credential: credential.trim(),
          ticketId: ticketIdToCheckIn,
          checkInAll: checkAll,
        }),
      });

      setTicketData(current => {
        if (!current) return current;
        const nowIso = result.ticket?.checkedInAt || new Date().toISOString();
        const updatedAll = current.allTickets?.map(t => {
          if (checkAll || t.id === ticketIdToCheckIn) {
            return { ...t, status: 'checked_in', checkedInAt: nowIso };
          }
          return t;
        }) || [];

        const isCurrentTicket = checkAll || !ticketIdToCheckIn || ticketIdToCheckIn === current.ticket?.id;

        return {
          ...current,
          status: isCurrentTicket ? 'checked_in' : current.status,
          checkedInAt: isCurrentTicket ? nowIso : current.checkedInAt,
          allTickets: updatedAll,
        };
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAdmitting(false);
    }
  };

  const pendingTicketsCount = ticketData?.allTickets?.filter(t => t.status === 'issued')?.length || 0;

  return (
    <main className="ticket-scanner-page">
      <Topbar active="staff" />
      <section className="scanner-wrap">
        <div className="scanner-header">
          <h1>Ticket Scanner</h1>
          <p>Verify attendee and ticket details, then approve or deny gate entry.</p>
        </div>

        <form className="scanner-form" onSubmit={handleScan}>
          <div className="input-group">
            <input
              type="text"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="Enter Booking ID (e.g. EVT-73453260FC), Ticket Code, or scan QR"
              className="credential-input"
            />
            <button type="submit" disabled={scanning} className="scan-btn">
              {scanning ? <Clock className="animate-spin" /> : <Scan />}
              {scanning ? "Checking..." : "Verify"}
            </button>
            <button type="button" onClick={cameraOn ? stopCamera : startCamera} className="scan-btn camera-btn">
              <Camera /> {cameraOn ? 'Stop Camera' : 'Scan QR Camera'}
            </button>
          </div>
          <div className="scanner-hints">
            <span>💡 <b>Accepts:</b> Booking IDs (e.g. <code>EVT-73453260FC</code> or <code>BOOKING EVT-73453260FC</code>), Ticket Codes (<code>TKT-41D4...</code>), or QR scans.</span>
          </div>
        </form>

        {cameraOn && (
          <div className="scanner-camera">
            <video ref={videoRef} playsInline muted />
            <span>Hold the QR code inside the camera view</span>
          </div>
        )}

        {cameraError && (
          <div className="error-message">
            <XCircle />
            {cameraError}
          </div>
        )}

        {error && (
          <div className="error-message">
            <XCircle />
            {error}
          </div>
        )}

        {ticketData && (
          <div className="ticket-result">
            {ticketData.valid ? (
              <div className="valid-ticket">
                <div className={`status-badge ${ticketData.status === 'checked_in' ? 'warning' : 'success'}`}>
                  <CheckCircle />
                  {ticketData.status === 'checked_in' ? 'Already Checked In' : 'Valid Ticket — Ready for Entry'}
                </div>

                <div className="ticket-details">
                  <div className="detail-section">
                    <h3><User /> Customer Details</h3>
                    <p><strong>Name:</strong> {ticketData.customer?.name || 'Guest'}</p>
                    {ticketData.customer?.email && <p><strong>Email:</strong> {ticketData.customer.email}</p>}
                    {ticketData.customer?.phone && <p><strong>Phone:</strong> {ticketData.customer.phone}</p>}
                  </div>

                  <div className="detail-section">
                    <h3><TicketIcon /> Ticket Information</h3>
                    <p><strong>Ticket Code:</strong> {ticketData.ticket?.code}</p>
                    <p><strong>Ticket Type:</strong> {ticketData.ticket?.ticketType}</p>
                    <p><strong>Booking Reference:</strong> {ticketData.booking?.reference}</p>
                    <p><strong>Quantity:</strong> {ticketData.booking?.quantity}</p>
                  </div>

                  <div className="detail-section">
                    <h3><Calendar /> Event Details</h3>
                    <p><strong>Event:</strong> {ticketData.event?.title}</p>
                    <p><strong>Venue:</strong> {ticketData.event?.venue}</p>
                    <p><strong>Location:</strong> {ticketData.event?.location?.city || ticketData.event?.location?.address || JSON.stringify(ticketData.event?.location || '')}</p>
                    <p><strong>Starts:</strong> {new Date(ticketData.event?.startsAt).toLocaleString()}</p>
                    <p><strong>Ends:</strong> {new Date(ticketData.event?.endsAt).toLocaleString()}</p>
                  </div>

                  {ticketData.allTickets && ticketData.allTickets.length > 1 && (
                    <div className="attendee-tickets-section">
                      <h3><Users style={{ width: 18, height: 18, color: '#762796', display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Group Booking Tickets ({ticketData.allTickets.length} Attendees)</h3>
                      <p style={{ margin: '4px 0 10px', fontSize: 13, color: '#687488' }}>
                        This booking contains {ticketData.allTickets.length} tickets. Check in individual attendees as they arrive or admit the entire party at once.
                      </p>
                      <div className="attendee-tickets-grid">
                        {ticketData.allTickets.map((t) => (
                          <div key={t.id} className={`attendee-ticket-card ${t.isCurrent ? 'current' : ''}`}>
                            <header>
                              <b>Attendee #{t.attendeeNumber}</b>
                              <span className={`workflow-status status-${t.status}`}>
                                {t.status === 'checked_in' ? 'Checked In' : 'Issued'}
                              </span>
                            </header>
                            <code>{t.code}</code>
                            {t.status === 'checked_in' ? (
                              <span className="checked-tag"><CheckCircle style={{ width: 14, height: 14 }} /> Checked in</span>
                            ) : (
                              <button
                                type="button"
                                disabled={admitting}
                                className="checkin-btn"
                                onClick={() => allowEntry(t.id, false)}
                              >
                                <CheckCircle style={{ width: 14, height: 14 }} /> Check In Attendee #{t.attendeeNumber}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ticketData.status === 'checked_in' && (
                    <div className="checked-in-info">
                      <p><strong>Checked In At:</strong> {new Date(ticketData.checkedInAt).toLocaleString()}</p>
                    </div>
                  )}

                  {ticketData.status === 'issued' && (
                    <div className="gate-decision">
                      <p>
                        <strong>Identity and event verified?</strong>
                        <br />
                        Only allow entry after matching the attendee and event details above.
                      </p>
                      {ticketData.allTickets && ticketData.allTickets.length > 1 && pendingTicketsCount > 1 && (
                        <button
                          type="button"
                          className="check-all-btn"
                          disabled={admitting}
                          onClick={() => allowEntry(null, true)}
                        >
                          <Users style={{ width: 18 }} /> {admitting ? 'Checking in party…' : `Check In All (${pendingTicketsCount} Attendees)`}
                        </button>
                      )}
                      <button disabled={admitting} onClick={() => allowEntry(ticketData.ticket?.id, false)}>
                        <CheckCircle /> {admitting ? 'Checking in…' : 'Allow Entry & Check In'}
                      </button>
                      <button
                        className="deny"
                        onClick={() => {
                          setTicketData(null);
                          setCredential('');
                        }}
                      >
                        <XCircle /> Deny / Scan Next
                      </button>
                    </div>
                  )}

                  {ticketData.status === 'checked_in' && (
                    <div className="entry-approved">
                      <CheckCircle />
                      <div>
                        <b>Entry approved</b>
                        <span>This ticket is checked in and marked as used.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="invalid-ticket">
                <div className="status-badge error">
                  <XCircle />
                  Invalid Ticket
                </div>
                <p>{ticketData.message || 'This ticket is not valid for entry.'}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
