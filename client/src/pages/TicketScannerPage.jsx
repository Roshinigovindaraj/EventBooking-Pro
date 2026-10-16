import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";
import { ArrowLeft, Scan, User, Calendar, MapPin, Ticket as TicketIcon, CheckCircle, XCircle, Clock } from "lucide-react";
import { Topbar } from "./public/CatalogPage.jsx";

export default function TicketScannerPage() {
  const { user, loading } = useAuth();
  const [credential, setCredential] = useState("");
  const [ticketData, setTicketData] = useState(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  if (loading) return <p className="state-message">Loading…</p>;
  if (!user) return <Navigate to="/auth/login" replace/>;

  const handleScan = async (e) => {
    e.preventDefault();
    if (!credential.trim()) return;
    
    setScanning(true);
    setError("");
    setTicketData(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/v1/public/tickets/lookup?credential=${encodeURIComponent(credential)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to lookup ticket");
      }
      
      setTicketData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleQRScan = (result) => {
    if (result) {
      const url = new URL(result);
      const credential = url.searchParams.get('credential');
      if (credential) {
        setCredential(credential);
        handleScan({ preventDefault: () => {} });
      }
    }
  };

  return (
    <main className="ticket-scanner-page">
      <Topbar active="staff" />
      <section className="scanner-wrap">
        <div className="scanner-header">
          <h1>Ticket Scanner</h1>
          <p>Scan QR code or enter credential to verify ticket</p>
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
          </div>
        </form>

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
