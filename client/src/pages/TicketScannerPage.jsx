import React, { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";
import { Camera, Scan, User, Calendar, Ticket as TicketIcon, CheckCircle, XCircle, Clock, Users, ArrowRight, Upload, SwitchCamera } from "lucide-react";
import { Topbar } from "./public/CatalogPage.jsx";
import jsQR from "jsqr";

const playBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    /* Silent if audio context not permitted */
  }
};

export default function TicketScannerPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [credential, setCredential] = useState("");
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const requestedEventId = searchParams.get("eventId");

  const extractCredential = value => {
    if (!value) return '';
    const trimmed = String(value).trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.credential) return String(parsed.credential);
      if (parsed.ticketId) return String(parsed.ticketId);
      if (parsed.code) return String(parsed.code);
      if (parsed.bookingReference) return String(parsed.bookingReference);
    } catch { /* not JSON */ }
    try {
      const url = new URL(trimmed);
      const cred = url.searchParams.get('credential');
      if (cred) return cred;
      const bookingRef = url.searchParams.get('booking');
      if (bookingRef) return bookingRef;
    } catch { /* not a URL */ }
    return trimmed;
  };

  const stopCamera = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Track stop error:", err);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    setCameraOn(false);
  };

  const scanFrame = () => {
    if (!streamRef.current || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          playBeep();
          if (navigator.vibrate) {
            try { navigator.vibrate(120); } catch {}
          }
          const scannedValue = extractCredential(code.data);
          setCredential(scannedValue);
          stopCamera();
          handleScan(null, scannedValue);
          return;
        }
      }
    }
    scanAnimationRef.current = requestAnimationFrame(scanFrame);
  };

  const startCamera = async (targetFacingMode = facingMode) => {
    setCameraError("");
    setError("");
    stopCamera();

    if (!navigator?.mediaDevices?.getUserMedia) {
      return setCameraError("Camera access is not supported by this browser. Enter the Booking ID or upload a QR image.");
    }

    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraOn(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("muted", "true");
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Autoplay note:", playErr);
        }
      }

      if (scanAnimationRef.current) {
        cancelAnimationFrame(scanAnimationRef.current);
      }
      scanAnimationRef.current = requestAnimationFrame(scanFrame);
    } catch (cameraFailure) {
      stopCamera();
      if (cameraFailure.name === "NotAllowedError" || cameraFailure.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera permissions in your browser or use 'Upload QR'.");
      } else if (cameraFailure.name === "NotFoundError" || cameraFailure.name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device. You can upload a QR image or enter the ID manually.");
      } else {
        setCameraError(cameraFailure.message || "Camera permission was not granted or camera is busy.");
      }
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setCameraError("");
    const reader = new FileReader();
    reader.onload = (fileEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            playBeep();
            if (navigator.vibrate) {
              try { navigator.vibrate(120); } catch {}
            }
            const extracted = extractCredential(code.data);
            setCredential(extracted);
            handleScan(null, extracted);
          } else {
            setError("Could not detect a QR code in the uploaded image. Please ensure the QR code is clearly visible or enter the ID manually.");
          }
        } catch (err) {
          setError("Error reading image: " + err.message);
        }
      };
      img.src = fileEvent.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

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

  const allowEntry = async (targetTicketId = null, checkAll = false, count = 1) => {
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
          checkInCount: count,
        }),
      });

      setTicketData(current => {
        if (!current) return current;
        const resTicket = result.ticket || {};
        const nowIso = resTicket.checkedInAt || new Date().toISOString();
        const finalAdmit = resTicket.admitCount || current.admitCount || 1;
        const finalChecked = resTicket.checkedInCount ?? (current.checkedInCount + count);
        const finalRemaining = resTicket.remainingToAdmit ?? Math.max(0, finalAdmit - finalChecked);
        const finalStatus = resTicket.status || (finalRemaining === 0 ? 'checked_in' : 'partially_checked_in');

        return {
          ...current,
          status: finalStatus,
          checkedInAt: nowIso,
          admitCount: finalAdmit,
          checkedInCount: finalChecked,
          remainingToAdmit: finalRemaining,
          checkIns: resTicket.checkIns || [
            ...(current.checkIns || []),
            { attendeeIndex: finalChecked, checkedInAt: nowIso, count: 1 }
          ],
          ticket: {
            ...current.ticket,
            status: finalStatus,
            checkedInCount: finalChecked,
            remainingToAdmit: finalRemaining,
            checkIns: resTicket.checkIns || current.ticket?.checkIns,
            checkedInAt: nowIso,
          },
          allTickets: result.allTickets || current.allTickets,
        };
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAdmitting(false);
    }
  };

  const admitCount = ticketData?.admitCount || ticketData?.ticket?.admitCount || ticketData?.booking?.quantity || 1;
  const checkedInCount = ticketData?.checkedInCount ?? ticketData?.ticket?.checkedInCount ?? (ticketData?.status === 'checked_in' ? admitCount : 0);
  const remainingToAdmit = ticketData?.remainingToAdmit ?? ticketData?.ticket?.remainingToAdmit ?? Math.max(0, admitCount - checkedInCount);
  const isGroupTicket = admitCount > 1;

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
            <button
              type="button"
              onClick={cameraOn ? stopCamera : () => startCamera()}
              className={`scan-btn camera-btn ${cameraOn ? 'active' : ''}`}
            >
              <Camera /> {cameraOn ? "Stop Camera" : "Scan QR Camera"}
            </button>
            <label className="scan-btn upload-btn" title="Upload QR image from device">
              <Upload size={18} /> Upload QR
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </label>
          </div>
          <div className="scanner-hints">
            <span>💡 <b>Accepts:</b> Live Camera QR scan, QR image upload, Booking IDs (e.g. <code>EVT-73453260FC</code>), or Ticket Codes (<code>TKT-41D4...</code>).</span>
          </div>
        </form>

        {/* Camera Viewfinder (Always in DOM to guarantee videoRef.current exists) */}
        <div
          className="scanner-camera-box"
          style={{ display: cameraOn ? "block" : "none" }}
        >
          <div className="camera-viewfinder">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="camera-video-feed"
            />
            <div className="camera-scanner-overlay">
              <div className="corner corner-tl" />
              <div className="corner corner-tr" />
              <div className="corner corner-bl" />
              <div className="corner corner-br" />
              <div className="scanner-laser-line" />
            </div>
          </div>
          <div className="camera-controls">
            <span className="camera-guide-text">Align attendee QR code inside the target frame</span>
            <div className="camera-btn-group">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="btn-camera-action"
                title="Switch Camera"
              >
                <SwitchCamera size={16} /> Switch Camera ({facingMode === "environment" ? "Back" : "Front"})
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="btn-camera-action stop-btn"
              >
                <XCircle size={16} /> Close Camera
              </button>
            </div>
          </div>
        </div>

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
                <div className={`status-badge ${remainingToAdmit === 0 ? 'warning' : isGroupTicket && checkedInCount > 0 ? 'partial' : 'success'}`} style={{
                  background: remainingToAdmit === 0 ? '#fef3c7' : isGroupTicket && checkedInCount > 0 ? '#ede9fe' : '#ecfdf5',
                  color: remainingToAdmit === 0 ? '#92400e' : isGroupTicket && checkedInCount > 0 ? '#5b21b6' : '#065f46',
                  borderColor: remainingToAdmit === 0 ? '#fde68a' : isGroupTicket && checkedInCount > 0 ? '#ddd6fe' : '#a7f3d0'
                }}>
                  <CheckCircle />
                  {remainingToAdmit === 0
                    ? `All ${admitCount} Attendees Already Checked In (Fully Used)`
                    : isGroupTicket && checkedInCount > 0
                    ? `Partially Checked In — ${checkedInCount} of ${admitCount} Admitted (${remainingToAdmit} Remaining)`
                    : isGroupTicket
                    ? `Valid Group Ticket — Admit ${admitCount} Members (${admitCount} Remaining)`
                    : 'Valid Single Ticket — Ready for Entry'}
                </div>

                {isGroupTicket && (
                  <div style={{ margin: '14px 0 18px', padding: '14px 18px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <b style={{ color: '#1e293b', fontSize: 14 }}>
                        👥 Group Entry Progress: {checkedInCount} of {admitCount} Entered
                      </b>
                      <span style={{ fontSize: 13, fontWeight: 700, color: remainingToAdmit === 0 ? '#059669' : '#7c3aed' }}>
                        {remainingToAdmit === 0 ? '✓ Complete' : `${remainingToAdmit} Remaining`}
                      </span>
                    </div>
                    <div style={{ height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round((checkedInCount / admitCount) * 100)}%`,
                        background: remainingToAdmit === 0 ? '#10b981' : '#8b5cf6',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                )}

                <div className="ticket-details">
                  <div className="detail-section">
                    <h3><User /> Customer Details</h3>
                    <p><strong>Primary Booker:</strong> {ticketData.customer?.name || 'Guest'}</p>
                    {ticketData.customer?.email && <p><strong>Email:</strong> {ticketData.customer.email}</p>}
                    {ticketData.customer?.phone && <p><strong>Phone:</strong> {ticketData.customer.phone}</p>}
                  </div>

                  <div className="detail-section">
                    <h3><TicketIcon /> Ticket Information</h3>
                    <p><strong>Ticket Code:</strong> {ticketData.ticket?.code}</p>
                    <p><strong>Ticket Type:</strong> {ticketData.ticket?.ticketType}</p>
                    <p><strong>Booking ID:</strong> {ticketData.booking?.reference}</p>
                    <p><strong>Total Party Size:</strong> <span style={{ fontWeight: 800, color: '#6d28d9' }}>{admitCount} {admitCount === 1 ? 'Attendee' : 'Attendees (Single Ticket)'}</span></p>
                    <p><strong>Already Admitted:</strong> {checkedInCount} attendee(s)</p>
                    <p><strong>Remaining to Enter:</strong> <b style={{ color: remainingToAdmit > 0 ? '#b45309' : '#059669' }}>{remainingToAdmit} attendee(s)</b></p>
                  </div>

                  <div className="detail-section">
                    <h3><Calendar /> Event Details</h3>
                    <p><strong>Event:</strong> {ticketData.event?.title}</p>
                    <p><strong>Venue:</strong> {ticketData.event?.venue}</p>
                    <p><strong>City / Address:</strong> {ticketData.event?.location?.city || ticketData.event?.location?.address || 'Venue'}</p>
                    <p><strong>Starts:</strong> {new Date(ticketData.event?.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    {ticketData.event?.totalCapacity > 0 && (
                      <p><strong>Event Capacity:</strong> {ticketData.event.totalCapacity} seats ({ticketData.event.remainingTickets} remaining)</p>
                    )}
                  </div>

                  {/* Arrival History Timeline */}
                  {((ticketData.checkIns && ticketData.checkIns.length > 0) || isGroupTicket) && (
                    <div style={{ gridColumn: '1 / -1', marginTop: 12, padding: '16px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} style={{ color: '#7c3aed' }} /> Entry &amp; Arrival History ({checkedInCount} of {admitCount} Logged)
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                        {Array.from({ length: admitCount }).map((_, idx) => {
                          const log = ticketData.checkIns?.[idx];
                          const isEntered = idx < checkedInCount;
                          return (
                            <div key={idx} style={{
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: `1px solid ${isEntered ? '#a7f3d0' : '#e2e8f0'}`,
                              background: isEntered ? '#f0fdf4' : '#f8fafc',
                              fontSize: 13
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <b>Attendee #{idx + 1}</b>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: isEntered ? '#dcfce7' : '#f1f5f9',
                                  color: isEntered ? '#15803d' : '#64748b'
                                }}>
                                  {isEntered ? 'Checked In' : 'Pending'}
                                </span>
                              </div>
                              <p style={{ margin: '4px 0 0', fontSize: 12, color: isEntered ? '#166534' : '#94a3b8' }}>
                                {isEntered ? (
                                  log?.checkedInAt
                                    ? `Entered: ${new Date(log.checkedInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                                    : 'Entered previously'
                                ) : (
                                  'Can enter separately when they arrive'
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {remainingToAdmit > 0 && (
                    <div className="gate-decision" style={{ gridColumn: '1 / -1', marginTop: 14, background: '#fdf4ff', border: '1px solid #f0abfc', padding: 20, borderRadius: 12 }}>
                      <p style={{ margin: '0 0 12px', color: '#701a75' }}>
                        <strong>Allow Gate Entry for Arriving Attendee(s)</strong>
                        <br />
                        {isGroupTicket ? (
                          <span>This ticket has <b>{remainingToAdmit} remaining attendee(s)</b>. Click below to check in the person arriving right now:</span>
                        ) : (
                          <span>Verify the attendee identity and grant gate access.</span>
                        )}
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <button
                          type="button"
                          disabled={admitting}
                          onClick={() => allowEntry(ticketData.ticket?.id, false, 1)}
                          style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <CheckCircle size={18} />
                          {admitting ? 'Checking In…' : isGroupTicket ? `Check In Attendee #${checkedInCount + 1} (Arriving Now)` : 'Allow Entry & Check In'}
                        </button>

                        {isGroupTicket && remainingToAdmit > 1 && (
                          <button
                            type="button"
                            disabled={admitting}
                            onClick={() => allowEntry(ticketData.ticket?.id, true)}
                            style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                          >
                            <Users size={18} />
                            {admitting ? 'Checking In…' : `Admit All Remaining (${remainingToAdmit} Attendees Together)`}
                          </button>
                        )}

                        <button
                          type="button"
                          className="deny"
                          onClick={() => {
                            setTicketData(null);
                            setCredential('');
                          }}
                        >
                          <XCircle /> Clear / Scan Next
                        </button>
                      </div>
                    </div>
                  )}

                  {remainingToAdmit === 0 && (
                    <div className="entry-approved" style={{ gridColumn: '1 / -1', marginTop: 14 }}>
                      <CheckCircle />
                      <div>
                        <b>All {admitCount} Attendees Admitted</b>
                        <span>Every member of this group booking has checked in. This ticket is now fully completed.</span>
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
