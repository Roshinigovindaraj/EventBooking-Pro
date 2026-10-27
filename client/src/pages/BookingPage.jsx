import React from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, CreditCard, Download, Landmark, MapPin, Minus, Plus, Share2, ShieldCheck, Smartphone, Ticket, WalletCards } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";
import { Topbar, publicEvent } from "./public/CatalogPage.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { downloadEventTickets, ticketQrPayload } from "../utils/ticketPdf.js";

const paymentMethods = [["Card", CreditCard], ["UPI", Smartphone], ["Net Banking", Landmark], ["Wallet", WalletCards]];
const numericPrice = (value) => Number(String(value).replace(/[^0-9]/g, "")) || 0;
const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const existing = document.querySelector('script[data-razorpay-checkout]');
  if (existing) { existing.addEventListener("load", () => resolve(true), { once: true }); existing.addEventListener("error", () => resolve(false), { once: true }); return; }
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.dataset.razorpayCheckout = "true";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function BookingPage() {
  const { user, loading } = useAuth();
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = React.useState(location.state?.event || null);
  const [fetchingEvent, setFetchingEvent] = React.useState(!location.state?.event);
  const [step, setStep] = React.useState(1);
  const [quantity, setQuantity] = React.useState(1);
  const [ticketType, setTicketType] = React.useState(location.state?.event?.ticketTypes?.[0]?.name || "General Admission");
  const [coupon, setCoupon] = React.useState("");
  const [couponApplied, setCouponApplied] = React.useState(false);
  const [couponError, setCouponError] = React.useState("");
  const [payment, setPayment] = React.useState("Card");
  const [processing, setProcessing] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState("");
  const [booking, setBooking] = React.useState(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");

  React.useEffect(() => {
    if (event || !eventId) return;
    let active = true;
    apiRequest(`/events/${eventId}`)
      .then((res) => {
        if (active && res.item) {
          const item = {
            ...publicEvent(res.item, 0),
            endsAt: res.item.endsAt,
            ticketTypes: res.item.ticketTypes || [],
          };
          setEvent(item);
          if (item.ticketTypes?.[0]?.name) {
            setTicketType(item.ticketTypes[0].name);
          }
        }
      })
      .catch(() => null)
      .finally(() => {
        if (active) setFetchingEvent(false);
      });
    return () => { active = false; };
  }, [eventId, event]);

  React.useEffect(() => {
    if (!booking) { setQrCodeUrl(""); return undefined; }
    let active = true;
    QRCode.toDataURL(ticketQrPayload(booking), {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 320,
      color: { dark: "#09172e", light: "#ffffff" },
    }).then((url) => { if (active) setQrCodeUrl(url); })
      .catch(() => { if (active) setQrCodeUrl(""); });
    return () => { active = false; };
  }, [booking]);

  if (loading || fetchingEvent) return <p className="state-message">Loading event details…</p>;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: `/booking/${eventId}`, event }}/>; 
  if (!event) return <Navigate to="/discover" replace/>;

  const selectedTicket = event.ticketTypes?.find(type => type.name === ticketType);
  const basePrice = selectedTicket ? selectedTicket.priceMinor / 100 : numericPrice(event.price);
  const typeExtra = event.ticketTypes?.length ? 0 : ticketType === "Premium" ? 500 : ticketType === "VIP" ? 1000 : 0;
  const subtotal = (basePrice + typeExtra) * quantity;
  const fees = Math.round(subtotal * .05);
  const discount = couponApplied ? Math.round(subtotal * .1) : 0;
  const total = subtotal + fees - discount;
  const money = (amount) => `₹ ${amount.toLocaleString("en-IN")}`;
  const dateLabel = `${event.day} ${event.month} ${new Date(event.startsAt).getFullYear()}`;

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "EVENT10") { setCouponApplied(true); setCouponError(""); }
    else { setCouponApplied(false); setCouponError("Use EVENT10 for 10% off"); }
  };
  const confirmBooking = (paymentDetails = {}, persistedBooking = null) => {
      const owner = encodeURIComponent(user._id || user.id || user.email.toLowerCase());
      const key = `eventoria:bookings:${owner}`;
      const current = JSON.parse(localStorage.getItem(key) || "[]");
      const confirmed = { id: persistedBooking?.bookingReference || `EVT-${Date.now()}`, backendId: persistedBooking?._id, eventId: persistedBooking?.event || event.id, customerName: user.name, title: event.title, image: event.image, date: dateLabel, time: event.time, venue: event.venue, city: event.city, price: money(total), quantity, ticketType, tickets: paymentDetails.tickets || [], payment: paymentDetails.provider || payment, paymentId: paymentDetails.paymentId, orderId: paymentDetails.orderId, status: "Confirmed", bookedAt: persistedBooking?.createdAt || new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify([confirmed, ...current]));
      setBooking(confirmed); setProcessing(false); setStep(3);
  };
  const pay = async () => {
    setProcessing(true); setPaymentError("");
    try {
      const catalogResult = await apiRequest(`/events/${event.id}`);
      const backendEvent = catalogResult.item;
      if (!backendEvent) throw new Error("This event is no longer available for booking.");
      const backendTicketType = backendEvent.ticketTypes?.find((type) => type.name === ticketType);
      if (!backendTicketType) throw new Error(`${ticketType} is not configured for this event.`);
      const created = await apiRequest("/bookings", { method: "POST", body: JSON.stringify({ eventId: backendEvent._id, ticketTypeId: backendTicketType._id, quantity }) });
      const result = await apiRequest("/payments/razorpay/order", { method: "POST", body: JSON.stringify({ bookingId: created.booking._id }) });
      if (result.order.provider === "mock") {
        const confirmation = await apiRequest("/payments/mock-confirm", { method: "POST", body: JSON.stringify({ bookingId: created.booking._id }) });
        confirmBooking({ provider: "Development mock", tickets: confirmation.tickets }, confirmation.booking);
        return;
      }
      if (!await loadRazorpay()) throw new Error("Unable to load Razorpay Checkout. Check your internet connection.");
      const checkout = new window.Razorpay({
        key: result.keyId,
        order_id: result.order.id,
        amount: result.order.amount,
        currency: result.order.currency,
        name: "Eventoria",
        description: `${event.title} · ${ticketType} × ${quantity}`,
        image: "/images/hero-wedding.png",
        prefill: { name: user.name, email: user.email },
        notes: { eventId: String(event.id), ticketType, quantity: String(quantity) },
        theme: { color: "#ed1269" },
        modal: { ondismiss: () => setProcessing(false) },
        handler: async (response) => {
          try {
            const verified = await apiRequest("/payments/razorpay/verify", { method: "POST", body: JSON.stringify({ bookingId: created.booking._id, orderId: result.order.id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }) });
            if (!verified.verified) throw new Error("Payment could not be verified.");
            confirmBooking({ provider: "Razorpay", paymentId: verified.paymentId, orderId: verified.orderId, tickets: verified.tickets }, verified.booking);
          } catch (error) { setPaymentError(error.message); setProcessing(false); }
        },
      });
      checkout.on("payment.failed", (response) => { setPaymentError(response.error?.description || "Payment failed. Please try again."); setProcessing(false); });
      checkout.open();
    } catch (error) { setPaymentError(error.message); setProcessing(false); }
  };
  const [downloading, setDownloading] = React.useState(false);
  const [downloadStatus, setDownloadStatus] = React.useState("");

  const downloadTicket = async () => {
    if (!booking) return;
    setDownloading(true);
    setDownloadStatus("");
    try {
      await downloadEventTickets(booking);
      setDownloadStatus("✓ Ticket PDF downloaded successfully! Check your downloads.");
      setTimeout(() => setDownloadStatus(""), 5000);
    } catch (error) {
      setDownloadStatus(`Download failed: ${error.message || "Please try again."}`);
    } finally {
      setDownloading(false);
    }
  };

  const shareTicket = async () => {
    const text = `${booking.customerName} · ${booking.title} · ${booking.date} · Booking ${booking.id}`;
    if (navigator.share) await navigator.share({ title: "Eventoria E-Ticket", text }).catch(() => null);
    else await navigator.clipboard?.writeText(text);
  };

  return <main className="booking-page"><Topbar active="events"/><section className="booking-wrap">
    <button className="booking-back" onClick={() => navigate("/discover")}><ArrowLeft/> Back to events</button>
    <header className="booking-heading"><p>SECURE EVENT BOOKING</p><h1>{step === 3 ? "Your booking is confirmed" : "Complete Your Booking"}</h1><span>{step === 1 ? "Choose tickets and review your total." : step === 2 ? "Select a payment method and confirm." : "Your e-ticket is ready to use."}</span></header>
    <div className="booking-progress">{["Booking Options", "Checkout & Payment", "Confirmation & E-Ticket"].map((label, index) => <div className={step >= index + 1 ? "active" : ""} key={label}><b>{step > index + 1 ? <Check/> : index + 1}</b><span>{label}</span></div>)}</div>

    {step < 3 && <div className="booking-layout"><section className="booking-panel">
      <article className="booking-event"><img src={event.image} alt={event.title}/><div><span>{event.type}</span><h2>{event.title}</h2><p><CalendarDays/> {dateLabel} · {event.time}</p><p><MapPin/> {event.venue}, {event.city}</p></div></article>
      {step === 1 ? (
        <div className="booking-options">
          <h2>Select Booking Options</h2>
          <label>
            Ticket type
            <select value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
              {event.ticketTypes?.length > 0 ? (
                event.ticketTypes.map(t => {
                  const rem = t.remaining !== undefined ? t.remaining : Math.max(0, (t.capacity || 0) - (t.sold || 0));
                  return (
                    <option key={t.name} value={t.name} disabled={rem === 0}>
                      {t.name} — ₹{(t.priceMinor || 0) / 100} ({rem} left of {t.capacity})
                    </option>
                  );
                })
              ) : (
                <>
                  <option>General Admission</option>
                  <option>Premium</option>
                  <option>VIP</option>
                </>
              )}
            </select>
          </label>
          {(() => {
            const tierRem = selectedTicket?.remaining !== undefined
              ? selectedTicket.remaining
              : (selectedTicket ? Math.max(0, (selectedTicket.capacity || 0) - (selectedTicket.sold || 0)) : (event.remainingTickets || 100));
            const maxAllowed = Math.min(10, Math.max(1, tierRem));
            return (
              <div className="ticket-quantity">
                <span>
                  <b>Number of tickets ({quantity} members)</b>
                  <small style={{ color: tierRem < 20 ? '#c2410c' : '#047857', fontWeight: 600 }}>
                    {tierRem <= 0
                      ? '❌ Sold out for this tier'
                      : `🎟️ ${tierRem} remaining (Event Capacity: ${selectedTicket?.capacity || event.totalCapacity || event.capacity || 100})`}
                  </small>
                </span>
                <div>
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus/></button>
                  <b>{quantity}</b>
                  <button type="button" disabled={quantity >= maxAllowed} onClick={() => setQuantity(Math.min(maxAllowed, quantity + 1))}><Plus/></button>
                </div>
              </div>
            );
          })()}
          <div className="booking-lock">
            <ShieldCheck/> Your selected tickets will be securely reserved as a single master ticket for your party.
          </div>
          <button className="booking-primary" onClick={() => setStep(2)}>
            Continue to Checkout <ArrowRight/>
          </button>
        </div>
      ) : (
        <div className="booking-options">
          <h2>Select Payment Method</h2>
          <div className="payment-methods">
            {paymentMethods.map(([name, Icon]) => (
              <button className={payment === name ? "active" : ""} onClick={() => setPayment(name)} key={name}>
                <Icon/><span>{name}</span>
              </button>
            ))}
          </div>
          <div className="payment-note">
            <ShieldCheck/>
            <span><b>Secured by Razorpay</b><small>Payment is verified securely before your booking is confirmed.</small></span>
          </div>
          {paymentError && <div className="payment-error">{paymentError}</div>}
          <div className="checkout-actions">
            <button onClick={() => setStep(1)}>Back</button>
            <button className="booking-primary" disabled={processing} onClick={pay}>
              {processing ? "Opening Razorpay…" : `Pay ${money(total)} Securely`} <ArrowRight/>
            </button>
          </div>
        </div>
      )}
    </section><aside className="price-panel"><h2>Price Breakdown</h2><dl><div><dt>{ticketType} × {quantity}</dt><dd>{money(subtotal)}</dd></div><div><dt>Taxes & fees</dt><dd>{money(fees)}</dd></div>{couponApplied&&<div className="discount"><dt>Coupon discount</dt><dd>− {money(discount)}</dd></div>}<div className="total"><dt>Total Amount</dt><dd>{money(total)}</dd></div></dl><label>Apply coupon code<div><input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter coupon"/><button onClick={applyCoupon}>Apply</button></div></label>{couponApplied&&<p className="coupon-success"><Check/> EVENT10 applied</p>}{couponError&&<p className="coupon-error">{couponError}</p>}</aside></div>}

    {step === 3 && booking && <section className="booking-success">
      <div className="success-mark"><Check/></div><p>PAYMENT SUCCESSFUL</p><h2>Booking Confirmed!</h2><span>A confirmation has been created for your Eventoria account.</span>
      <article className="ticket-card ticket-voucher">
        <header><Ticket/><b>E-Ticket / Booking Voucher {booking.quantity > 1 ? `(Master Pass: ${booking.quantity} Members)` : ''}</b></header>
        <div className="ticket-event"><img src={booking.image} alt=""/><div><b>{booking.title}</b><small>{booking.date} · {booking.time}</small><small>{booking.venue}, {booking.city}</small></div></div>
        <div className="ticket-qr">{qrCodeUrl ? <img src={qrCodeUrl} alt={`QR code for ticket ${booking.id}`}/> : <span>Generating QR code…</span>}</div>
        <dl>
          <div><dt>Booking ID</dt><dd>{booking.id}</dd></div>
          <div><dt>Primary Guest</dt><dd>{booking.customerName || user.name}</dd></div>
          <div><dt>Ticket Type</dt><dd>{booking.ticketType}</dd></div>
          <div><dt>Admit Count</dt><dd><b style={{ color: '#7c3aed' }}>{booking.quantity} {booking.quantity === 1 ? 'Attendee' : 'Attendees (Single Pass)'}</b></dd></div>
          <div><dt>Seat / Entry</dt><dd>{booking.ticketType === "General Admission" ? "GA - Standing" : booking.ticketType}</dd></div>
          <div><dt>Total Paid</dt><dd>{booking.price}</dd></div>
        </dl>
        {booking.quantity > 1 && (
          <div style={{
            margin: "12px 18px 0",
            padding: "10px 14px",
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            borderRadius: 8,
            fontSize: 12,
            color: "#6d28d9",
            textAlign: "left"
          }}>
            <b>👥 Group Pass Information:</b>
            <p style={{ margin: "3px 0 0", color: "#5b21b6", lineHeight: 1.4 }}>
              This single ticket admits all {booking.quantity} members. Each member can enter together or arrive at different times using this same ticket. Gate staff will log each arrival incrementally.
            </p>
          </div>
        )}
        <footer>
          <button disabled={downloading} onClick={downloadTicket} style={{ minWidth: 120 }}>
            <Download size={16} /> {downloading ? "Preparing PDF…" : "Download"}
          </button>
          <button onClick={shareTicket}><Share2 size={16}/> Share</button>
        </footer>
        {downloadStatus && (
          <div style={{
            margin: "12px 18px 0",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            textAlign: "center",
            color: downloadStatus.startsWith("✓") ? "#047857" : "#b91c1c",
            background: downloadStatus.startsWith("✓") ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${downloadStatus.startsWith("✓") ? "#a7f3d0" : "#fecaca"}`
          }}>
            {downloadStatus}
          </div>
        )}
      </article>
      <div className="success-actions"><button className="booking-primary" onClick={() => navigate("/dashboard")}>View My Bookings <ArrowRight/></button></div>
    </section>}
  </section><SiteFooter/></main>;
}
