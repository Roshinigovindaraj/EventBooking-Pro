import React from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Flame,
  Landmark,
  MapPin,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  Smartphone,
  Ticket,
  TrendingUp,
  WalletCards,
  XCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { apiRequest } from "../services/apiClient.js";
import { Topbar, publicEvent } from "./public/CatalogPage.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { downloadEventTickets, ticketQrPayload } from "../utils/ticketPdf.js";
import CelebrationPoppers, { fireConfettiCelebration } from "../components/CelebrationPoppers.jsx";

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
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [event, setEvent] = React.useState(location.state?.event || null);
  const [fetchingEvent, setFetchingEvent] = React.useState(true);
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
  const [existingBooking, setExistingBooking] = React.useState(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);
  const [downloadStatus, setDownloadStatus] = React.useState("");

  // Always fetch fresh real-time event details & live ticket sales from the database
  const loadFreshEvent = React.useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await apiRequest(`/events/${eventId}`);
      if (res.item) {
        const item = {
          ...publicEvent(res.item, 0),
          endsAt: res.item.endsAt,
          ticketTypes: res.item.ticketTypes || [],
          totalCapacity: res.item.totalCapacity,
          totalSold: res.item.totalSold,
          remainingTickets: res.item.remainingTickets,
        };
        setEvent(item);
        if (item.ticketTypes?.length > 0) {
          setTicketType((curr) => {
            const match = item.ticketTypes.find((t) => t.name === curr);
            return match ? curr : item.ticketTypes[0].name;
          });
        }
      }
    } catch (err) {
      console.error("Failed to load event details", err);
    } finally {
      setFetchingEvent(false);
    }
  }, [eventId]);

  React.useEffect(() => {
    loadFreshEvent();
  }, [loadFreshEvent]);

  // Check for confirmed booking in searchParams, sessionStorage, or user bookings
  React.useEffect(() => {
    if (!user || !eventId) return;
    const confirmedParam = searchParams.get("confirmed") || searchParams.get("bookingId");
    const owner = encodeURIComponent(user._id || user.id || user.email?.toLowerCase() || "");
    const key = `eventoria:bookings:${owner}`;
    const localBookings = JSON.parse(localStorage.getItem(key) || "[]");

    // 1. Check if user just confirmed in current session
    const sessionKey = `lastConfirmedBooking_${eventId}`;
    const cachedSession = sessionStorage.getItem(sessionKey);
    if (cachedSession) {
      try {
        const parsed = JSON.parse(cachedSession);
        if (parsed && (parsed.eventId === eventId || parsed.id === confirmedParam)) {
          setBooking(parsed);
          setExistingBooking(parsed);
          setStep(3);
          return;
        }
      } catch {}
    }

    // 2. Check local bookings list
    const foundLocal = localBookings.find(
      (b) => (b.eventId === eventId || b.id === confirmedParam || b.backendId === confirmedParam) && b.status === "Confirmed"
    );
    if (foundLocal) {
      setExistingBooking(foundLocal);
      if (confirmedParam) {
        setBooking(foundLocal);
        setStep(3);
        return;
      }
    }

    // 3. Check server for user's confirmed bookings for this event
    apiRequest("/bookings/me")
      .then((res) => {
        const myBookings = res.items || [];
        const match = myBookings.find(
          (b) => String(b.event?._id || b.event) === String(eventId) && b.status === "confirmed"
        );
        if (match) {
          const startsAt = match.event?.startsAt ? new Date(match.event.startsAt) : null;
          const dateStr = startsAt && !Number.isNaN(startsAt.valueOf())
            ? startsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "Date confirmed";
          const timeStr = startsAt && !Number.isNaN(startsAt.valueOf())
            ? startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
            : "";
          const matchedTicketType = match.event?.ticketTypes?.find(
            (t) => String(t._id) === String(match.ticketTypeId)
          );
          const normalized = {
            id: match.bookingReference || match._id,
            backendId: match._id,
            eventId: match.event?._id || eventId,
            customerName: user.name,
            title: match.event?.title || event?.title || "Confirmed Event",
            image: match.event?.images?.[0] || event?.image || "/images/hero1.png",
            date: dateStr,
            time: timeStr,
            venue: match.event?.venueName || match.event?.location?.address || event?.venue || "Venue",
            city: match.event?.location?.city || event?.city || "",
            price: `₹ ${((match.totalMinor || 0) / 100).toLocaleString("en-IN")}`,
            quantity: match.quantity,
            ticketType: matchedTicketType?.name || "General Admission",
            tickets: match.tickets || [],
            payment: "Confirmed",
            status: "Confirmed",
            bookedAt: match.createdAt,
          };
          setExistingBooking(normalized);
          if (confirmedParam) {
            setBooking(normalized);
            setStep(3);
          }
        }
      })
      .catch(() => null);
  }, [user, eventId, searchParams, event]);

  // Handle incoming Razorpay redirect parameters if payment redirected back
  React.useEffect(() => {
    const paymentId = searchParams.get("razorpay_payment_id");
    const orderId = searchParams.get("razorpay_order_id");
    const signature = searchParams.get("razorpay_signature");
    const pendingBookingId = sessionStorage.getItem("eventoria_pending_booking_id");

    if (paymentId && (pendingBookingId || orderId)) {
      setProcessing(true);
      apiRequest("/payments/razorpay/verify", {
        method: "POST",
        body: JSON.stringify({
          bookingId: pendingBookingId,
          orderId,
          paymentId,
          signature,
        }),
      })
        .then((verified) => {
          if (verified.verified) {
            sessionStorage.removeItem("eventoria_pending_booking_id");
            sessionStorage.removeItem("eventoria_pending_order_id");
            confirmBooking(
              {
                provider: "Razorpay",
                paymentId: verified.paymentId,
                orderId: verified.orderId,
                tickets: verified.tickets,
              },
              verified.booking
            );
          }
        })
        .catch((err) => {
          setPaymentError(err.message || "Payment verification failed.");
        })
        .finally(() => {
          setProcessing(false);
        });
    }
  }, [searchParams]);

  // QR Code generation
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

  if (loading || (fetchingEvent && !event)) return <p className="state-message">Loading live event details…</p>;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: `/booking/${eventId}`, event }}/>; 
  if (!event) return <Navigate to="/discover" replace/>;

  // Dynamic Ticket Tiers Variation (Normal vs VIP vs VVIP)
  const computedTiers = React.useMemo(() => {
    const rawTiers = event?.ticketTypes || [];
    const baseP = rawTiers.length > 0 ? (rawTiers[0].priceMinor / 100) : numericPrice(event?.price || 499);

    if (rawTiers.length > 1) {
      return rawTiers.map((t) => {
        const isVipTier = /vip|front|platinum/i.test(t.name);
        const isVvipTier = /vvip|front row|diamond|exclusive/i.test(t.name);
        const sold = Number(t.sold) || 0;
        const cap = Number(t.capacity) || 100;
        const rem = t.remaining !== undefined ? Number(t.remaining) : Math.max(0, cap - sold);
        return {
          id: t._id,
          name: t.name,
          price: (t.priceMinor || 0) / 100,
          capacity: cap,
          sold,
          remaining: rem,
          isSoldOut: rem <= 0,
          isVip: isVipTier,
          badge: isVvipTier ? "💎 VVIP FRONT ROW" : isVipTier ? "👑 VIP ALL-ACCESS" : "🎫 STANDARD NORMAL",
          tagClass: isVvipTier ? "tier-tag-vvip" : isVipTier ? "tier-tag-vip" : "tier-tag-normal",
          perks: isVvipTier
            ? ["Guaranteed front row stage seating", "Backstage artist lounge access", "Complimentary gourmet catering pack", "Dedicated VIP concierge & priority entry"]
            : isVipTier
            ? ["Priority fast-track VIP gate entry (no queues)", "Reserved VIP Lounge & prime stage view", "Complimentary welcome drink & snack", "Official VIP commemorative souvenir pass"]
            : ["Standard festival / venue entry", "General standing & open seating", "Mobile digital pass with QR code scan", "Access to food & merchandise stalls"]
        };
      });
    }

    // If only 1 tier (or none) configured on event, auto-generate standard Normal, VIP, and VVIP variations
    const firstTier = rawTiers[0];
    const normalCap = firstTier?.capacity || 100;
    const normalSold = firstTier?.sold || event?.totalSold || 0;
    const normalRem = firstTier?.remaining !== undefined ? firstTier.remaining : Math.max(0, normalCap - normalSold);

    return [
      {
        id: firstTier?._id || "tier-normal",
        name: firstTier?.name?.includes("VIP") ? "Normal (General Admission)" : (firstTier?.name || "Normal (General Admission)"),
        price: baseP,
        capacity: normalCap,
        sold: normalSold,
        remaining: normalRem,
        isSoldOut: normalRem <= 0,
        isVip: false,
        badge: "🎫 STANDARD NORMAL",
        tagClass: "tier-tag-normal",
        perks: [
          "Standard festival / venue entry",
          "General standing & open seating",
          "Mobile digital pass with QR code scan",
          "Access to food & merchandise stalls"
        ]
      },
      {
        id: "tier-vip",
        name: "VIP Pass",
        price: Math.round(baseP * 2.5) || 1499,
        capacity: Math.max(25, Math.round(normalCap * 0.4)),
        sold: Math.round(normalSold * 0.25),
        remaining: Math.max(0, Math.round(normalCap * 0.4) - Math.round(normalSold * 0.25)),
        isSoldOut: false,
        isVip: true,
        badge: "👑 VIP ALL-ACCESS",
        tagClass: "tier-tag-vip",
        perks: [
          "Priority fast-track VIP gate entry (no queues)",
          "Reserved VIP Lounge & prime stage view",
          "Complimentary welcome drink & snack",
          "Official VIP commemorative souvenir pass"
        ]
      },
      {
        id: "tier-vvip",
        name: "VVIP / Front Row",
        price: Math.round(baseP * 4) || 2499,
        capacity: Math.max(15, Math.round(normalCap * 0.2)),
        sold: Math.round(normalSold * 0.1),
        remaining: Math.max(0, Math.round(normalCap * 0.2) - Math.round(normalSold * 0.1)),
        isSoldOut: false,
        isVip: true,
        badge: "💎 VVIP FRONT ROW",
        tagClass: "tier-tag-vvip",
        perks: [
          "Guaranteed front row stage seating",
          "Backstage artist lounge access",
          "Complimentary gourmet catering pack",
          "Dedicated VIP concierge & priority entry"
        ]
      }
    ];
  }, [event]);

  const selectedTier = computedTiers.find((t) => t.name === ticketType) || computedTiers[0];
  const basePrice = selectedTier ? selectedTier.price : numericPrice(event.price);
  const subtotal = basePrice * quantity;
  const fees = Math.round(subtotal * 0.05);
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + fees - discount;
  const money = (amount) => `₹ ${amount.toLocaleString("en-IN")}`;
  const dateLabel = `${event.day} ${event.month} ${new Date(event.startsAt).getFullYear()}`;

  // Live real sales & remaining calculations
  const tierCapacity = Number(selectedTier?.capacity || 100);
  const tierSold = Number(selectedTier?.sold || 0);
  const tierRemaining = Number(selectedTier?.remaining !== undefined ? selectedTier.remaining : Math.max(0, tierCapacity - tierSold));
  const maxAllowedQuantity = Math.min(10, Math.max(1, tierRemaining));
  const percentSold = tierCapacity > 0 ? Math.min(100, Math.round((tierSold / tierCapacity) * 100)) : 0;

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === "EVENT10") { setCouponApplied(true); setCouponError(""); }
    else { setCouponApplied(false); setCouponError("Use EVENT10 for 10% off"); }
  };

  const confirmBooking = (paymentDetails = {}, persistedBooking = null) => {
    const owner = encodeURIComponent(user._id || user.id || user.email.toLowerCase());
    const key = `eventoria:bookings:${owner}`;
    const current = JSON.parse(localStorage.getItem(key) || "[]");
    const bookingId = persistedBooking?.bookingReference || `EVT-${Date.now()}`;
    const confirmed = {
      id: bookingId,
      backendId: persistedBooking?._id,
      eventId: persistedBooking?.event || event.id,
      customerName: user.name,
      title: event.title,
      image: event.image,
      date: dateLabel,
      time: event.time,
      venue: event.venue,
      city: event.city,
      price: money(total),
      quantity,
      ticketType,
      tickets: paymentDetails.tickets || [],
      payment: paymentDetails.provider || payment,
      paymentId: paymentDetails.paymentId,
      orderId: paymentDetails.orderId,
      status: "Confirmed",
      bookedAt: persistedBooking?.createdAt || new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify([confirmed, ...current]));
    sessionStorage.setItem(`lastConfirmedBooking_${event.id}`, JSON.stringify(confirmed));
    setBooking(confirmed);
    setExistingBooking(confirmed);
    setProcessing(false);
    setStep(3);

    // Persist confirmed state in URL so page refresh stays on confirmation
    navigate(`/booking/${event.id}?confirmed=${bookingId}`, { replace: true });

    // Refresh live inventory & sales count
    loadFreshEvent();
  };

  const pay = async () => {
    setProcessing(true);
    setPaymentError("");
    try {
      const catalogResult = await apiRequest(`/events/${event.id}`);
      const backendEvent = catalogResult.item;
      if (!backendEvent) throw new Error("This event is no longer available for booking.");
      const backendTicketType = backendEvent.ticketTypes?.find((type) => type.name === ticketType) || backendEvent.ticketTypes?.[0];
      if (!backendTicketType) throw new Error("No bookable ticket tier is configured for this event.");

      const created = await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify({ eventId: backendEvent._id, ticketTypeId: backendTicketType._id, quantity }),
      });

      // Save pending booking ID to track across any redirects
      sessionStorage.setItem("eventoria_pending_booking_id", created.booking._id);
      sessionStorage.setItem("eventoria_pending_event_id", event.id);

      const result = await apiRequest("/payments/razorpay/order", {
        method: "POST",
        body: JSON.stringify({ bookingId: created.booking._id }),
      });

      if (result.order.provider === "mock") {
        const confirmation = await apiRequest("/payments/mock-confirm", {
          method: "POST",
          body: JSON.stringify({ bookingId: created.booking._id }),
        });
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
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
        handler: async (response) => {
          try {
            const verified = await apiRequest("/payments/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                bookingId: created.booking._id,
                orderId: result.order.id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            if (!verified.verified) throw new Error("Payment could not be verified.");
            sessionStorage.removeItem("eventoria_pending_booking_id");
            confirmBooking(
              {
                provider: "Razorpay",
                paymentId: verified.paymentId,
                orderId: verified.orderId,
                tickets: verified.tickets,
              },
              verified.booking
            );
          } catch (error) {
            setPaymentError(error.message);
            setProcessing(false);
          }
        },
      });

      checkout.on("payment.failed", (response) => {
        setPaymentError(response.error?.description || "Payment failed. Please try again.");
        setProcessing(false);
      });

      checkout.open();
    } catch (error) {
      setPaymentError(error.message);
      setProcessing(false);
    }
  };

  const downloadTicket = async () => {
    if (!booking) return;
    setDownloading(true);
    setDownloadStatus("");
    try {
      await downloadEventTickets(booking);
      fireConfettiCelebration();
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

  return (
    <main className="booking-page">
      <Topbar active="events" />
      <section className="booking-wrap">
        <button className="booking-back" onClick={() => navigate("/discover")}>
          <ArrowLeft /> Back to events
        </button>

        <header className="booking-heading">
          <p>SECURE EVENT BOOKING</p>
          <h1>{step === 3 ? "Your booking is confirmed" : "Complete Your Booking"}</h1>
          <span>
            {step === 1
              ? "Choose tickets and review your total."
              : step === 2
              ? "Select a payment method and confirm."
              : "Your e-ticket is ready to use."}
          </span>
        </header>

        <div className="booking-progress">
          {["Booking Options", "Checkout & Payment", "Confirmation & E-Ticket"].map((label, index) => (
            <div className={step >= index + 1 ? "active" : ""} key={label}>
              <b>{step > index + 1 ? <Check /> : index + 1}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Existing Booking Alert Banner */}
        {step < 3 && existingBooking && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1.5px solid #86efac",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <CheckCircle2 color="#059669" size={26} />
              <div>
                <b style={{ color: "#065f46", fontSize: "15px", display: "block" }}>
                  You have an active confirmed booking for this event!
                </b>
                <p style={{ margin: "2px 0 0", color: "#047857", fontSize: "13px" }}>
                  Booking Ref: <b>{existingBooking.id}</b> ({existingBooking.quantity} {existingBooking.quantity === 1 ? "ticket" : "tickets"} · {existingBooking.ticketType})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setBooking(existingBooking);
                setStep(3);
              }}
              style={{
                background: "#059669",
                color: "#fff",
                border: "none",
                padding: "9px 18px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              View My E-Ticket <ArrowRight size={15} />
            </button>
          </div>
        )}

        {step < 3 && (
          <div className="booking-layout">
            <section className="booking-panel">
              <article className="booking-event">
                <img src={event.image} alt={event.title} />
                <div>
                  <span>{event.type}</span>
                  <h2>{event.title}</h2>
                  <p><CalendarDays /> {dateLabel} · {event.time}</p>
                  <p><MapPin /> {event.venue}, {event.city}</p>
                </div>
              </article>

              {step === 1 ? (
                <div className="booking-options">
                  <h2>Select Booking Options</h2>

                  {/* Entire Event Sold Out Warning */}
                  {(event.isSoldOut || (event.remainingTickets !== undefined && event.remainingTickets <= 0)) && (
                    <div style={{
                      background: "#fef2f2",
                      border: "1.5px solid #fca5a5",
                      borderRadius: "12px",
                      padding: "16px 18px",
                      marginBottom: "16px",
                      color: "#991b1b"
                    }}>
                      <b style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <XCircle size={20} color="#dc2626" /> Event Completely Sold Out
                      </b>
                      <p style={{ margin: "4px 0 0", color: "#b91c1c", fontSize: "13px", lineHeight: 1.5 }}>
                        All {event.totalCapacity || event.capacity || 100} tickets for this event have been sold out. Ticket bookings are currently closed.
                      </p>
                    </div>
                  )}

                  {/* Single Tier Sold Out Warning */}
                  {tierRemaining <= 0 && !(event.isSoldOut || (event.remainingTickets !== undefined && event.remainingTickets <= 0)) && (
                    <div style={{
                      background: "#fff7ed",
                      border: "1.5px solid #fed7aa",
                      borderRadius: "12px",
                      padding: "14px 18px",
                      marginBottom: "16px",
                      color: "#9a3412"
                    }}>
                      <b style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <AlertCircle size={18} color="#ea580c" /> Tier Sold Out ({ticketType})
                      </b>
                      <p style={{ margin: "3px 0 0", color: "#c2410c", fontSize: "12px" }}>
                        All tickets for this tier are sold out. Please select another available ticket type above to book tickets.
                      </p>
                    </div>
                  )}

                  <div className="ticket-tier-section" style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <label style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#1e1b4b" }}>
                        Choose Ticket Tier Variation:
                      </label>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        {computedTiers.length} formats available
                      </span>
                    </div>

                    <div className="ticket-tier-cards-grid">
                      {computedTiers.map((tier) => {
                        const isSelected = ticketType === tier.name;
                        const isSold = tier.isSoldOut;
                        return (
                          <div
                            key={tier.name}
                            className={`ticket-tier-card ${tier.isVip ? "is-vip-card" : "is-normal-card"} ${isSelected ? "selected-card" : ""} ${isSold ? "sold-out-card" : ""}`}
                            onClick={() => { if (!isSold) setTicketType(tier.name); }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isSold) setTicketType(tier.name); }}
                          >
                            <div className="tier-card-header">
                              <span className={`tier-card-badge ${tier.tagClass}`}>{tier.badge}</span>
                              <span className="tier-card-check">
                                {isSelected ? "✓ SELECTED" : isSold ? "SOLD OUT" : "SELECT"}
                              </span>
                            </div>

                            <div className="tier-card-title-row">
                              <h4 className="tier-card-title">{tier.name}</h4>
                              <div className="tier-card-price">
                                <span className="tier-card-currency">₹</span>
                                <span className="tier-card-amount">{tier.price.toLocaleString("en-IN")}</span>
                                <span className="tier-card-per">/ ticket</span>
                              </div>
                            </div>

                            <ul className="tier-card-perks">
                              {tier.perks.map((perk, i) => (
                                <li key={i}>
                                  <span className="perk-bullet">{tier.isVip ? "★" : "✓"}</span>
                                  <span>{perk}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="tier-card-footer">
                              <span className={`tier-card-availability ${tier.remaining < 20 ? "low-stock" : ""}`}>
                                {isSold ? "❌ Sold Out" : `🎟️ ${tier.remaining} tickets left`}
                              </span>
                              <span className="tier-card-cta">
                                {isSelected ? "Active Format" : "Choose format"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <label style={{ marginTop: "14px" }}>
                      <span style={{ fontSize: "12px", color: "#4b5563" }}>Or select format from dropdown:</span>
                      <select value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
                        {computedTiers.map((t) => (
                          <option key={t.name} value={t.name} disabled={t.isSoldOut}>
                            {t.name} — ₹{t.price.toLocaleString("en-IN")} ({t.sold} sold · {t.isSoldOut ? "SOLD OUT" : `${t.remaining} left of ${t.capacity}`})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Dynamic Real Sales & Real-Time Capacity Tracker */}
                  <div className="ticket-quantity-wrapper" style={{ margin: "14px 0" }}>
                    <div className="ticket-quantity">
                      <span>
                        <b>Number of tickets ({quantity} {quantity === 1 ? "member" : "members"})</b>
                        <small style={{ color: tierRemaining < 20 ? "#c2410c" : "#047857", fontWeight: 600 }}>
                          {tierRemaining <= 0
                            ? "❌ Sold out for this tier"
                            : `🎟️ ${tierRemaining} remaining (${tierCapacity} total capacity)`}
                        </small>
                      </span>
                      <div>
                        <button type="button" disabled={tierRemaining <= 0} onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                          <Minus />
                        </button>
                        <b>{tierRemaining <= 0 ? 0 : quantity}</b>
                        <button
                          type="button"
                          disabled={quantity >= maxAllowedQuantity || tierRemaining <= 0}
                          onClick={() => setQuantity(Math.min(maxAllowedQuantity, quantity + 1))}
                        >
                          <Plus />
                        </button>
                      </div>
                    </div>

                    {/* Live Ticket Sales Metrics Bar */}
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "14px 18px",
                        background: "#f8fafc",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Flame size={16} color="#f97316" />
                          Real Sales: <b style={{ color: "#2563eb", fontSize: "14px" }}>{tierSold} tickets sold</b>
                        </span>
                        <span style={{ color: tierRemaining <= 15 ? "#dc2626" : "#059669", fontWeight: 700, fontSize: "13px" }}>
                          {tierRemaining <= 0 ? "0 available (SOLD OUT)" : `${tierRemaining} available / ${tierCapacity} capacity`}
                        </span>
                      </div>

                      <div
                        style={{
                          width: "100%",
                          height: "9px",
                          background: "#e2e8f0",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percentSold}%`,
                            height: "100%",
                            background: percentSold >= 100 ? "#dc2626" : "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #2563eb 100%)",
                            borderRadius: "6px",
                            transition: "width 0.4s ease-in-out",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "#64748b",
                          marginTop: "6px",
                          fontWeight: 500,
                        }}
                      >
                        <span>{percentSold}% of total capacity booked</span>
                        <span style={{ color: tierRemaining <= 0 ? "#dc2626" : "#059669", fontWeight: 600 }}>
                          {tierRemaining <= 0 ? "● SOLD OUT" : "● Live Database Count"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="booking-lock">
                    <ShieldCheck /> Your selected tickets will be securely reserved as a single master ticket for your party.
                  </div>

                  <button
                    className="booking-primary"
                    disabled={tierRemaining <= 0 || event.isSoldOut || (event.remainingTickets !== undefined && event.remainingTickets <= 0)}
                    onClick={() => setStep(2)}
                    style={
                      tierRemaining <= 0 || event.isSoldOut || (event.remainingTickets !== undefined && event.remainingTickets <= 0)
                        ? { background: "#94a3b8", cursor: "not-allowed", opacity: 0.8 }
                        : {}
                    }
                  >
                    {event.isSoldOut || (event.remainingTickets !== undefined && event.remainingTickets <= 0)
                      ? "Event Sold Out - Bookings Closed"
                      : tierRemaining <= 0
                      ? "Selected Tier Sold Out"
                      : "Continue to Checkout"} <ArrowRight />
                  </button>
                </div>
              ) : (
                <div className="booking-options">
                  <h2>Select Payment Method</h2>
                  <div className="payment-methods">
                    {paymentMethods.map(([name, Icon]) => (
                      <button
                        className={payment === name ? "active" : ""}
                        onClick={() => setPayment(name)}
                        key={name}
                      >
                        <Icon />
                        <span>{name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="payment-note">
                    <ShieldCheck />
                    <span>
                      <b>Secured by Razorpay</b>
                      <small>Payment is verified securely before your booking is confirmed.</small>
                    </span>
                  </div>
                  {paymentError && <div className="payment-error">{paymentError}</div>}
                  <div className="checkout-actions">
                    <button onClick={() => setStep(1)}>Back</button>
                    <button className="booking-primary" disabled={processing} onClick={pay}>
                      {processing ? "Opening Razorpay…" : `Pay ${money(total)} Securely`} <ArrowRight />
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="price-panel">
              <h2>Price Breakdown</h2>
              <dl>
                <div>
                  <dt>{ticketType} × {quantity}</dt>
                  <dd>{money(subtotal)}</dd>
                </div>
                <div>
                  <dt>Taxes & fees</dt>
                  <dd>{money(fees)}</dd>
                </div>
                {couponApplied && (
                  <div className="discount">
                    <dt>Coupon discount</dt>
                    <dd>− {money(discount)}</dd>
                  </div>
                )}
                <div className="total">
                  <dt>Total Amount</dt>
                  <dd>{money(total)}</dd>
                </div>
              </dl>
              <label>
                Apply coupon code
                <div>
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Enter coupon"
                  />
                  <button onClick={applyCoupon}>Apply</button>
                </div>
              </label>
              {couponApplied && <p className="coupon-success"><Check /> EVENT10 applied</p>}
              {couponError && <p className="coupon-error">{couponError}</p>}
            </aside>
          </div>
        )}

        {step === 3 && booking && (
          <section className="booking-success" style={{ position: "relative", overflow: "visible" }}>
            <CelebrationPoppers top="24px" left="-24px" right="-24px" />
            <div className="success-mark"><Check /></div>
            <p>PAYMENT SUCCESSFUL</p>
            <h2>Booking Confirmed!</h2>
            <span>A confirmation has been created for your Eventoria account.</span>

            {(() => {
              const isConfirmedVip = /vip|gold|platinum|front/i.test(booking.ticketType || "");
              return (
                <article className={`ticket-card ticket-voucher ${isConfirmedVip ? "vip-ticket-format" : "normal-ticket-format"}`}>
                  <header className={isConfirmedVip ? "vip-voucher-header" : "normal-voucher-header"}>
                    {isConfirmedVip ? (
                      <>
                        <span className="vip-crown-icon">👑</span>
                        <b>★ VIP ALL-ACCESS PASS ★ {booking.quantity > 1 ? `(Master Group Pass: ${booking.quantity} Members)` : ""}</b>
                      </>
                    ) : (
                      <>
                        <Ticket />
                        <b>🎫 Standard Normal Pass {booking.quantity > 1 ? `(Master Pass: ${booking.quantity} Members)` : ""}</b>
                      </>
                    )}
                  </header>

                  <div className="ticket-event">
                    <img src={booking.image} alt="" />
                    <div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px", flexWrap: "wrap" }}>
                        <b>{booking.title}</b>
                        <span className={`voucher-badge-pill ${isConfirmedVip ? "vip-pill" : "normal-pill"}`}>
                          {isConfirmedVip ? "👑 VIP PASS HOLDER" : "🎫 NORMAL PASS"}
                        </span>
                      </div>
                      <small>{booking.date} · {booking.time}</small>
                      <small>{booking.venue}, {booking.city}</small>
                    </div>
                  </div>

                  <div className={`ticket-qr ${isConfirmedVip ? "vip-qr-frame" : ""}`}>
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt={`QR code for ticket ${booking.id}`} />
                    ) : (
                      <span>Generating QR code…</span>
                    )}
                  </div>

                  <dl>
                    <div>
                      <dt>Booking ID</dt>
                      <dd>{booking.id}</dd>
                    </div>
                    <div>
                      <dt>Primary Guest</dt>
                      <dd>{booking.customerName || user.name}</dd>
                    </div>
                    <div>
                      <dt>Ticket Format</dt>
                      <dd>
                        <b style={{ color: isConfirmedVip ? "#d97706" : "#7c3aed" }}>
                          {isConfirmedVip ? `👑 ${booking.ticketType}` : `🎫 ${booking.ticketType}`}
                        </b>
                      </dd>
                    </div>
                    <div>
                      <dt>Admit Count</dt>
                      <dd>
                        <b style={{ color: isConfirmedVip ? "#d97706" : "#7c3aed" }}>
                          {booking.quantity} {booking.quantity === 1 ? "Attendee" : "Attendees (Single Pass)"}
                        </b>
                      </dd>
                    </div>
                    <div>
                      <dt>Seat / Entry</dt>
                      <dd>
                        {isConfirmedVip
                          ? <span className="vip-entry-text">👑 Fast-Track VIP Lane & Lounge</span>
                          : (booking.ticketType === "General Admission" ? "GA - Standing / Open Seating" : booking.ticketType)}
                      </dd>
                    </div>
                    <div>
                      <dt>Total Paid</dt>
                      <dd>{booking.price}</dd>
                    </div>
                  </dl>

                  {isConfirmedVip && (
                    <div className="voucher-vip-perks-box">
                      <b>✨ Exclusive VIP Privileges Included:</b>
                      <p>
                        ✓ Dedicated VIP Express Entry Gate (No Queuing) · ✓ VIP Lounge & Complimentary Refreshments · ✓ Prime Stage Seating Area · ✓ Souvenir VIP Pass
                      </p>
                    </div>
                  )}

              {booking.quantity > 1 && (
                <div
                  style={{
                    margin: "12px 18px 0",
                    padding: "10px 14px",
                    background: "#f5f3ff",
                    border: "1px solid #ddd6fe",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#6d28d9",
                    textAlign: "left",
                  }}
                >
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
                <button onClick={shareTicket}><Share2 size={16} /> Share</button>
              </footer>

              {downloadStatus && (
                <div
                  style={{
                    margin: "12px 18px 0",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textAlign: "center",
                    color: downloadStatus.startsWith("✓") ? "#047857" : "#b91c1c",
                    background: downloadStatus.startsWith("✓") ? "#ecfdf5" : "#fef2f2",
                    border: `1px solid ${downloadStatus.startsWith("✓") ? "#a7f3d0" : "#fecaca"}`,
                  }}
                >
                  {downloadStatus}
                </div>
              )}
            </article>
              );
            })()}

            <div className="success-actions" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <button className="booking-primary" onClick={() => navigate("/dashboard")}>
                View My Bookings <ArrowRight />
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setBooking(null);
                  navigate(`/booking/${event.id}`, { replace: true });
                }}
                style={{
                  background: "#f8fafc",
                  color: "#334155",
                  border: "1.5px solid #cbd5e1",
                  padding: "12px 22px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Book Additional Tickets
              </button>
            </div>
          </section>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
