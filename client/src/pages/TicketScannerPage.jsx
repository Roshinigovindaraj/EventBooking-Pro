import React, { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";
import { Camera, Scan, User, Calendar, Ticket as TicketIcon, CheckCircle, XCircle, Clock } from "lucide-react";
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
    try { const parsed = JSON.parse(value); if (parsed.credential) return parsed.credential; } catch { /* QR may be a URL or raw credential. */ }
    try { return new URL(value).searchParams.get('credential') || value; } catch { return value; }
  };
  const stopCamera = () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; setCameraOn(false); };
  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);

  if (loading) return <p className="state-message">Loading…</p>;
  if (!user) return <Navigate to="/auth/login" replace/>;
  if (!user.roles?.some(role => ['event_staff','event_organizer','admin','super_admin'].includes(role))) return <Navigate to="/dashboard" replace/>;

  const handleScan = async (e, scannedCredential = credential) => {
    e.preventDefault();
    const value = extractCredential(scannedCredential.trim());
    if (!value) return;
    setCredential(value);
    
    setScanning(true);
    setError("");
    setTicketData(null);
    
    try {
      const data = await apiRequest(`/tickets/verify?credential=${encodeURIComponent(value)}`);
      if (requestedEventId && data.event?.id !== requestedEventId) throw new Error('This ticket belongs to a different event. Do not allow entry.');
      setTicketData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };
  const startCamera = async () => {
    setCameraError('');
    if (!('BarcodeDetector' in window)) return setCameraError('Camera QR scanning is not supported by this browser. Use Chrome/Edge or enter the credential manually.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:'environment' } } });
      streamRef.current = stream; setCameraOn(true);
      await new Promise(resolve => setTimeout(resolve, 0));
      videoRef.current.srcObject = stream; await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats:['qr_code'] });
      const scanFrame = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try { const codes = await detector.detect(videoRef.current); if (codes[0]?.rawValue) { const value = extractCredential(codes[0].rawValue); setCredential(value); stopCamera(); handleScan({ preventDefault:() => {} }, value); return; } } catch { /* Continue scanning the next frame. */ }
        window.setTimeout(scanFrame, 350);
      };
      scanFrame();
    } catch (cameraFailure) { stopCamera(); setCameraError(cameraFailure.message || 'Camera permission was not granted.'); }
  };

  const handleQRScan = (result) => {
    if (result) {
      const url = new URL(result);
      const credential = url.searchParams.get('credential');
      if (credential) {
        setCredential(credential);
        handleScan({ preventDefault: () => {} }, credential);
      }
    }
  };
  const allowEntry = async () => {
    setAdmitting(true); setError('');
    try {
      const result = await apiRequest('/tickets/check-in', { method:'POST', body:JSON.stringify({ eventId:ticketData.event.id, credential:credential.trim() }) });
      setTicketData(current => ({ ...current, status:'checked_in', checkedInAt:result.ticket.checkedInAt }));
    } catch (requestError) { setError(requestError.message); }
    finally { setAdmitting(false); }
  };

  return (
    <main className="ticket-scanner-page">
      <Topbar active="staff" />
      <section className="scanner-wrap">
        <div className="scanner-header">
          <h1>Ticket Scanner</h1>
          <p>Verify the QR details first, then explicitly allow entry.</p>
        </div>

        <form className="scanner-form" onSubmit={handleScan}>
          <div className="input-group">
            <input
              type="text"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="Enter ticket credential or scan QR code"
              className="credential-input"
            />
            <button type="submit" disabled={scanning} className="scan-btn">
              {scanning ? <Clock className="animate-spin" /> : <Scan />}
              {scanning ? "Checking..." : "Verify"}
            </button>
            <button type="button" onClick={cameraOn ? stopCamera : startCamera} className="scan-btn camera-btn"><Camera/> {cameraOn ? 'Stop Camera' : 'Scan QR Camera'}</button>
          </div>
        </form>
        {cameraOn && <div className="scanner-camera"><video ref={videoRef} playsInline muted/><span>Hold the QR code inside the camera view</span></div>}
        {cameraError && <div className="error-message"><XCircle/>{cameraError}</div>}

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
                <div className="status-badge success">
                  <CheckCircle />
                  {ticketData.status === 'checked_in' ? 'Already Checked In' : 'Valid Ticket'}
                </div>

                <div className="ticket-details">
                  <div className="detail-section">
                    <h3><User /> Customer Details</h3>
                    <p><strong>Name:</strong> {ticketData.customer.name}</p>
                    {ticketData.customer.email && <p><strong>Email:</strong> {ticketData.customer.email}</p>}
                    {ticketData.customer.phone && <p><strong>Phone:</strong> {ticketData.customer.phone}</p>}
                  </div>

                  <div className="detail-section">
                    <h3><TicketIcon /> Ticket Information</h3>
                    <p><strong>Ticket Code:</strong> {ticketData.ticket.code}</p>
                    <p><strong>Ticket Type:</strong> {ticketData.ticket.ticketType}</p>
                    <p><strong>Booking Reference:</strong> {ticketData.booking.reference}</p>
                    <p><strong>Quantity:</strong> {ticketData.booking.quantity}</p>
                  </div>

                  <div className="detail-section">
                    <h3><Calendar /> Event Details</h3>
                    <p><strong>Event:</strong> {ticketData.event.title}</p>
                    <p><strong>Venue:</strong> {ticketData.event.venue}</p>
                    <p><strong>Location:</strong> {ticketData.event.location}</p>
                    <p><strong>Starts:</strong> {new Date(ticketData.event.startsAt).toLocaleString()}</p>
                    <p><strong>Ends:</strong> {new Date(ticketData.event.endsAt).toLocaleString()}</p>
                  </div>

                  {ticketData.status === 'checked_in' && (
                    <div className="checked-in-info">
                      <p><strong>Checked In At:</strong> {new Date(ticketData.checkedInAt).toLocaleString()}</p>
                    </div>
                  )}
                  {ticketData.status === 'issued' && <div className="gate-decision"><p><strong>Identity and event verified?</strong><br/>Only allow entry after matching the attendee and event details above.</p><button disabled={admitting} onClick={allowEntry}><CheckCircle/> {admitting ? 'Checking in…' : 'Allow Entry & Check In'}</button><button className="deny" onClick={() => { setTicketData(null); setCredential(''); }}><XCircle/> Deny / Scan Next</button></div>}
                  {ticketData.status === 'checked_in' && <div className="entry-approved"><CheckCircle/><div><b>Entry approved</b><span>This ticket is now checked in and cannot be used again.</span></div></div>}
                </div>
              </div>
            ) : (
              <div className="invalid-ticket">
                <div className="status-badge error">
                  <XCircle />
                  Invalid Ticket
                </div>
                <p>{ticketData.message}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
