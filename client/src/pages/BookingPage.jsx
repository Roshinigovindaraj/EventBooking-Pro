import React from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, CreditCard, Download, Landmark, MapPin, Minus, Plus, ShieldCheck, Smartphone, Ticket, WalletCards } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Topbar, eventData } from "./public/CatalogPage.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

const paymentMethods = [["Card", CreditCard], ["UPI", Smartphone], ["Net Banking", Landmark], ["Wallet", WalletCards]];
const numericPrice = (value) => Number(String(value).replace(/[^0-9]/g, "")) || 0;

export default function BookingPage() {
  const { user, loading } = useAuth();
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const event = location.state?.event || eventData.find((item) => String(item.id) === String(eventId));
  const [step, setStep] = React.useState(1);
  const [quantity, setQuantity] = React.useState(1);
  const [ticketType, setTicketType] = React.useState("General Admission");
  const [coupon, setCoupon] = React.useState("");
  const [couponApplied, setCouponApplied] = React.useState(false);
  const [couponError, setCouponError] = React.useState("");
  const [payment, setPayment] = React.useState("Card");
  const [processing, setProcessing] = React.useState(false);
  const [booking, setBooking] = React.useState(null);

  if (loading) return <p className="state-message">Restoring your session…</p>;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: `/booking/${eventId}`, event }}/>; 
  if (!event) return <Navigate to="/discover" replace/>;

  const basePrice = numericPrice(event.price);
  const typeExtra = ticketType === "Premium" ? 500 : ticketType === "VIP" ? 1000 : 0;
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
  const pay = () => {
    setProcessing(true);
    window.setTimeout(() => {
      const owner = encodeURIComponent(user._id || user.id || user.email.toLowerCase());
      const key = `eventoria:bookings:${owner}`;
      const current = JSON.parse(localStorage.getItem(key) || "[]");
      const confirmed = { id: `EVT-${Date.now()}`, eventId: event.id, title: event.title, image: event.image, date: dateLabel, time: event.time, venue: event.venue, city: event.city, price: money(total), quantity, ticketType, payment, status: "Confirmed", bookedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify([confirmed, ...current]));
      setBooking(confirmed); setProcessing(false); setStep(3);
    }, 650);
  };
  const downloadTicket = () => {
    const content = [`EVENTORIA E-TICKET`, booking.title, `${booking.date} · ${booking.time}`, `${booking.venue}, ${booking.city}`, `${booking.ticketType} × ${booking.quantity}`, `Booking: ${booking.id}`, `Paid: ${booking.price}`].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = `${booking.id}-ticket.txt`; link.click(); URL.revokeObjectURL(url);
  };

  return <main className="booking-page"><Topbar active="events"/><section className="booking-wrap">
    <button className="booking-back" onClick={() => navigate("/discover")}><ArrowLeft/> Back to events</button>
    <header className="booking-heading"><p>SECURE EVENT BOOKING</p><h1>{step === 3 ? "Your booking is confirmed" : "Complete Your Booking"}</h1><span>{step === 1 ? "Choose tickets and review your total." : step === 2 ? "Select a payment method and confirm." : "Your e-ticket is ready to use."}</span></header>
    <div className="booking-progress">{["Booking Options", "Checkout & Payment", "Confirmation & E-Ticket"].map((label, index) => <div className={step >= index + 1 ? "active" : ""} key={label}><b>{step > index + 1 ? <Check/> : index + 1}</b><span>{label}</span></div>)}</div>

    {step < 3 && <div className="booking-layout"><section className="booking-panel">
      <article className="booking-event"><img src={event.image} alt={event.title}/><div><span>{event.type}</span><h2>{event.title}</h2><p><CalendarDays/> {dateLabel} · {event.time}</p><p><MapPin/> {event.venue}, {event.city}</p></div></article>
      {step === 1 ? <div className="booking-options"><h2>Select Booking Options</h2><label>Ticket type<select value={ticketType} onChange={(e) => setTicketType(e.target.value)}><option>General Admission</option><option>Premium</option><option>VIP</option></select></label><div className="ticket-quantity"><span><b>Number of tickets</b><small>Tickets are reserved during checkout</small></span><div><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus/></button><b>{quantity}</b><button onClick={() => setQuantity(Math.min(10, quantity + 1))}><Plus/></button></div></div><div className="booking-lock"><ShieldCheck/> Your selected tickets will be securely reserved.</div><button className="booking-primary" onClick={() => setStep(2)}>Continue to Checkout <ArrowRight/></button></div>
      : <div className="booking-options"><h2>Select Payment Method</h2><div className="payment-methods">{paymentMethods.map(([name, Icon]) => <button className={payment === name ? "active" : ""} onClick={() => setPayment(name)} key={name}><Icon/><span>{name}</span></button>)}</div><div className="payment-note"><ShieldCheck/><span><b>Secure demo payment</b><small>No real funds will be charged.</small></span></div><div className="checkout-actions"><button onClick={() => setStep(1)}>Back</button><button className="booking-primary" disabled={processing} onClick={pay}>{processing ? "Processing…" : `Pay ${money(total)}`} <ArrowRight/></button></div></div>}
    </section><aside className="price-panel"><h2>Price Breakdown</h2><dl><div><dt>{ticketType} × {quantity}</dt><dd>{money(subtotal)}</dd></div><div><dt>Taxes & fees</dt><dd>{money(fees)}</dd></div>{couponApplied&&<div className="discount"><dt>Coupon discount</dt><dd>− {money(discount)}</dd></div>}<div className="total"><dt>Total Amount</dt><dd>{money(total)}</dd></div></dl><label>Apply coupon code<div><input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter coupon"/><button onClick={applyCoupon}>Apply</button></div></label>{couponApplied&&<p className="coupon-success"><Check/> EVENT10 applied</p>}{couponError&&<p className="coupon-error">{couponError}</p>}</aside></div>}

    {step === 3 && booking && <section className="booking-success"><div className="success-mark"><Check/></div><p>PAYMENT SUCCESSFUL</p><h2>Booking Confirmed!</h2><span>A confirmation has been created for your Eventoria account.</span><article className="ticket-card"><div className="ticket-event"><img src={booking.image} alt=""/><div><b>{booking.title}</b><small>{booking.date} · {booking.time}</small><small>{booking.venue}, {booking.city}</small></div></div><div className="ticket-qr" aria-label="Ticket QR code">{Array.from({length:49},(_,i)=><i className={(i*7+i%5)%3 ? "on" : ""} key={i}/>)}</div><dl><div><dt>Booking ID</dt><dd>{booking.id}</dd></div><div><dt>Ticket Type</dt><dd>{booking.ticketType}</dd></div><div><dt>Quantity</dt><dd>{booking.quantity}</dd></div><div><dt>Total Paid</dt><dd>{booking.price}</dd></div></dl></article><div className="success-actions"><button onClick={downloadTicket}><Download/> Download E-Ticket</button><button className="booking-primary" onClick={() => navigate("/dashboard")}>View My Bookings <ArrowRight/></button></div></section>}
  </section><SiteFooter/></main>;
}
