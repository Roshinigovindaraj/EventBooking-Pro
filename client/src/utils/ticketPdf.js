import QRCode from "qrcode";
import { getApiBaseUrl } from "../services/apiClient.js";

export const canDownloadEventTickets = (booking) => {
  if (!booking) return false;
  const status = String(booking.rawStatus || booking.status || "").trim().toLowerCase();
  if (["cancelled", "canceled", "refunded", "rejected", "declined by venue owner", "expired"].some((bad) => status.includes(bad))) {
    return false;
  }
  if (status.includes("pending") && !status.includes("confirm")) {
    return false;
  }
  return status.includes("confirm") || status.includes("reschedule") || status.includes("paid") || status.includes("success");
};

export const ticketQrPayload = (booking, attendeeNumber = 1) => {
  const ticketId = `${booking.id || "EVT"}-P${String(attendeeNumber).padStart(2, "0")}`;
  const issuedTicket = booking.tickets?.[attendeeNumber - 1];
  if (!issuedTicket?.credential) {
    return JSON.stringify({ type: "eventoria-ticket", ticketId, eventId: booking.eventId, credential: null });
  }
  try {
    const apiBaseUrl = getApiBaseUrl();
    const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:5173";
    const absoluteApiBaseUrl = apiBaseUrl ? new URL(apiBaseUrl, origin).href.replace(/\/$/, "") : origin;
    return `${absoluteApiBaseUrl}/public/tickets/lookup?credential=${encodeURIComponent(issuedTicket.credential)}`;
  } catch {
    return JSON.stringify({ type: "eventoria-ticket", ticketId, eventId: booking.eventId, credential: issuedTicket.credential });
  }
};

const drawTicketBase = (pdf, isVip = false) => {
  if (isVip) {
    // Luxury Obsidian & Metallic Gold VIP Theme
    pdf.setFillColor(18, 15, 23); pdf.rect(0, 0, 210, 90, "F");
    pdf.setFillColor(28, 22, 36); pdf.roundedRect(7, 7, 196, 76, 3, 3, "F");
    pdf.setFillColor(44, 32, 16); pdf.circle(42, 43, 35, "F");
    pdf.setFillColor(212, 175, 55); pdf.circle(18, 15, 13, "F");
    pdf.setFillColor(245, 158, 11); pdf.circle(119, 12, 8, "F");
    pdf.setFillColor(217, 119, 6); pdf.circle(132, 78, 14, "F");
    // Shimmering outer gold border
    pdf.setDrawColor(212, 175, 55); pdf.setLineWidth(0.65);
    pdf.roundedRect(7.5, 7.5, 195, 75, 2.5, 2.5, "S");
  } else {
    // Standard Normal / General Admission Purple Theme
    pdf.setFillColor(246, 248, 252); pdf.rect(0, 0, 210, 90, "F");
    pdf.setFillColor(38, 12, 73); pdf.roundedRect(7, 7, 196, 76, 3, 3, "F");
    pdf.setFillColor(66, 20, 108); pdf.circle(42, 43, 35, "F");
    pdf.setFillColor(229, 20, 112); pdf.circle(18, 15, 15, "F");
    pdf.setFillColor(0, 190, 199); pdf.circle(119, 12, 9, "F");
    pdf.setFillColor(255, 60, 119); pdf.circle(132, 78, 15, "F");
  }
};

const drawGuidelineIcon = (pdf, x, y, kind, isVip = false) => {
  pdf.setDrawColor(isVip ? 251 : 255, isVip ? 191 : 255, isVip ? 36 : 255);
  pdf.setLineWidth(.35); pdf.circle(x, y, 3.2, "S");
  pdf.setLineWidth(.3);
  if (kind === "ticket") {
    pdf.roundedRect(x - 1.7, y - 1, 3.4, 2, .35, .35, "S");
    pdf.line(x, y - .8, x, y + .8);
  } else if (kind === "person") {
    pdf.circle(x, y - 1, .65, "S");
    pdf.ellipse(x, y + 1.05, 1.5, .85, "S");
  } else if (kind === "scan") {
    const d = 1.65; const s = .7;
    pdf.line(x-d, y-d+s, x-d, y-d); pdf.line(x-d, y-d, x-d+s, y-d);
    pdf.line(x+d-s, y-d, x+d, y-d); pdf.line(x+d, y-d, x+d, y-d+s);
    pdf.line(x-d, y+d-s, x-d, y+d); pdf.line(x-d, y+d, x-d+s, y+d);
    pdf.line(x+d-s, y+d, x+d, y+d); pdf.line(x+d, y+d, x+d, y+d-s);
    pdf.setFillColor(isVip ? 251 : 255, isVip ? 191 : 255, isVip ? 36 : 255); pdf.rect(x-.65, y-.65, .55, .55, "F"); pdf.rect(x+.25, y-.55, .5, .5, "F"); pdf.rect(x-.35, y+.25, .55, .55, "F");
  } else if (kind === "no-entry") {
    pdf.line(x - 1.4, y, x + 1.1, y); pdf.line(x + .5, y - .65, x + 1.2, y); pdf.line(x + .5, y + .65, x + 1.2, y);
    pdf.line(x - 1.55, y - 1.55, x + 1.55, y + 1.55);
  } else if (kind === "bag") {
    pdf.roundedRect(x - 1.35, y - .7, 2.7, 2.25, .25, .25, "S");
    pdf.line(x - .7, y - .7, x - .45, y - 1.35); pdf.line(x - .45, y - 1.35, x + .45, y - 1.35); pdf.line(x + .45, y - 1.35, x + .7, y - .7);
  } else if (kind === "info" || kind === "vip") {
    pdf.setFillColor(isVip ? 251 : 255, isVip ? 191 : 255, isVip ? 36 : 255); pdf.circle(x, y - 1.25, .23, "F");
    pdf.line(x, y - .45, x, y + 1.25);
  }
};

export async function downloadEventTickets(booking) {
  if (!canDownloadEventTickets(booking)) {
    throw new Error("Tickets are unavailable for cancelled, refunded, or expired bookings.");
  }

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [210, 90] });
  const paid = String(booking.price || "Paid").replace("₹", "Rs.");
  const quantity = Number(booking.quantity) || 1;
  const ticketType = booking.ticketType || "General Admission";
  const isVip = /vip|gold|platinum|front/i.test(ticketType);
  const customerName = String(booking.customerName || booking.userName || "Ticket Holder").trim();
  const eventTitle = String(booking.title || booking.venue || "Eventoria Experience").trim();
  const venueText = String(booking.venue || booking.city || "Venue").trim();
  const cityText = String(booking.city || "").trim();
  const venueLine = cityText && !venueText.includes(cityText) ? `${venueText}, ${cityText}` : venueText;
  const timeLine = String(booking.time || "Scheduled Time").trim();
  const dateLine = String(booking.date || "Scheduled Date").trim();
  const isVenue = Boolean(booking.isVenueReservation);

  const ticketId = `${booking.id || "EVT"}`;
  const qr = await QRCode.toDataURL(ticketQrPayload(booking, 1), { errorCorrectionLevel: "M", margin: 4, width: 800 });

  drawTicketBase(pdf, isVip);

  // Top header text
  if (isVip) {
    pdf.setTextColor(253, 224, 71); // Shimmering Gold
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
    pdf.text(isVenue ? "EVENTORIA  /  VIP VENUE RESERVATION" : (quantity > 1 ? `★ EVENTORIA  /  OFFICIAL VIP ALL-ACCESS GROUP PASS (${quantity} ATTENDEES) ★` : "★ EVENTORIA  /  OFFICIAL VIP ALL-ACCESS PASS ★"), 16, 18);
  } else {
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
    pdf.text(isVenue ? "EVENTORIA  /  VENUE RESERVATION" : (quantity > 1 ? `EVENTORIA  /  NORMAL LIVE PASS  —  GROUP (${quantity} ATTENDEES)` : "EVENTORIA  /  NORMAL (GENERAL ADMISSION)"), 16, 18);
  }

  pdf.setFontSize(21);
  pdf.setTextColor(255, 255, 255);
  const titleLines = pdf.splitTextToSize(eventTitle.toUpperCase(), 105);
  pdf.text(titleLines, 16, 36);
  const infoY = Math.min(59, 38 + titleLines.length * 8);

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
  pdf.setTextColor(isVip ? 253 : 255, isVip ? 230 : 255, isVip ? 138 : 255);
  pdf.text(`${dateLine}  /  ${timeLine}`, 16, infoY);
  pdf.text(venueLine, 16, infoY + 6);

  pdf.setFontSize(6.5);
  pdf.setTextColor(isVip ? 217 : 218, isVip ? 190 : 205, isVip ? 130 : 234);
  pdf.text(`BOOKING ${booking.id || "REFERENCE"}   |   ${ticketType.toUpperCase()}   |   ${quantity > 1 ? `GROUP PASS (${quantity})` : 'SINGLE PASS'}   |   TOTAL ${paid}`, 16, 76);

  // Perforated stub
  if (isVip) {
    pdf.setFillColor(32, 25, 41); pdf.rect(145, 7, 58, 76, "F");
    pdf.setDrawColor(212, 175, 55); pdf.setLineDashPattern([1.2, 1.5], 0); pdf.line(145, 10, 145, 80); pdf.setLineDashPattern([], 0);
    pdf.setFillColor(18, 15, 23); pdf.circle(145, 7, 3.2, "F"); pdf.circle(145, 83, 3.2, "F");
    pdf.setTextColor(251, 191, 36); pdf.setFont("helvetica", "bold"); pdf.setFontSize(quantity > 1 ? 6.5 : 7);
    pdf.text(quantity > 1 ? `★ VIP ADMIT ${quantity} MEMBERS ★` : "★ VIP ALL-ACCESS ★", 150, 14);
    pdf.setFontSize(5); pdf.setTextColor(212, 185, 145); pdf.text("VIP TICKET HOLDER", 153, 19);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(255, 255, 255);
    pdf.text(pdf.splitTextToSize(customerName, 40)[0], 153, 23.5);
    pdf.setFontSize(5.5); pdf.setTextColor(212, 185, 145);
    pdf.text("GATE", 153, 28); pdf.text("TIER", 168, 28); pdf.text("ADMIT", 185, 28);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(251, 191, 36);
    pdf.text("VIP", 153, 34);
    pdf.text("VIP", 168, 34);
    pdf.text(String(quantity).padStart(2, "0"), 185, 34);
  } else {
    pdf.setFillColor(255, 250, 253); pdf.rect(145, 7, 58, 76, "F");
    pdf.setDrawColor(92, 46, 122); pdf.setLineDashPattern([1.2, 1.5], 0); pdf.line(145, 10, 145, 80); pdf.setLineDashPattern([], 0);
    pdf.setFillColor(239, 241, 246); pdf.circle(145, 7, 3.2, "F"); pdf.circle(145, 83, 3.2, "F");
    pdf.setTextColor(55, 29, 78); pdf.setFont("helvetica", "bold"); pdf.setFontSize(quantity > 1 ? 6.5 : 7);
    pdf.text(quantity > 1 ? `ADMIT ${quantity} ATTENDEES` : "NORMAL / GA ADMIT", 153, 14);
    pdf.setFontSize(5); pdf.setTextColor(126, 100, 141); pdf.text("TICKET HOLDER", 153, 19);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(55, 29, 78);
    pdf.text(pdf.splitTextToSize(customerName, 40)[0], 153, 23.5);
    pdf.setFontSize(5.5); pdf.setTextColor(126, 100, 141);
    pdf.text("GATE", 153, 28); pdf.text("TIER", 168, 28); pdf.text("ADMIT", 185, 28);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(55, 29, 78);
    pdf.text("01", 153, 34);
    pdf.text(ticketType.toLowerCase().includes("normal") ? "NORM" : "GA", 168, 34);
    pdf.text(String(quantity).padStart(2, "0"), 185, 34);
  }

  pdf.setFillColor(255, 255, 255); pdf.roundedRect(157, 36, 34, 34, 2, 2, "F");
  if (isVip) {
    pdf.setDrawColor(212, 175, 55); pdf.setLineWidth(0.4);
    pdf.roundedRect(156.5, 35.5, 35, 35, 2, 2, "S");
  }
  pdf.addImage(qr, "PNG", 158, 37, 32, 32);

  if (isVip) {
    pdf.setFontSize(6); pdf.setTextColor(251, 191, 36);
    pdf.text("★ PRIORITY VIP SCAN ★", 174, 74, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.setTextColor(200, 180, 150);
    pdf.text(ticketId, 174, 79, { align: "center" });
  } else {
    pdf.setFontSize(6); pdf.setTextColor(55, 29, 78);
    pdf.text(quantity > 1 ? `SCAN FOR ENTRY (TOTAL: ${quantity})` : "SCAN FOR ENTRY", 174, 74, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.setTextColor(126, 100, 141);
    pdf.text(ticketId, 174, 79, { align: "center" });
  }

  // Back side: Guidelines & tier instructions
  pdf.addPage([210, 90], "landscape");
  drawTicketBase(pdf, isVip);
  if (isVip) {
    pdf.setFillColor(26, 21, 33); pdf.rect(7, 7, 196, 76, "F");
    pdf.setFillColor(58, 42, 19); pdf.circle(184, 13, 24, "F");
    pdf.setFillColor(212, 175, 55); pdf.circle(18, 15, 12, "F");
    pdf.setFillColor(245, 158, 11); pdf.circle(126, 10, 8, "F");
    pdf.setFillColor(217, 119, 6); pdf.circle(197, 77, 15, "F");
    pdf.setTextColor(254, 240, 138); pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
    pdf.text(`★ ${eventTitle.toUpperCase()}  —  VIP ALL-ACCESS PRIVILEGES ★`, 18, 29, { maxWidth: 170 });
    pdf.setFontSize(8); pdf.setTextColor(251, 191, 36);
    pdf.text("OFFICIAL VIP GUEST ENTRY & AMENITY INSTRUCTIONS", 18, 37);
    pdf.setDrawColor(212, 175, 55); pdf.setLineWidth(.3); pdf.line(100, 35.5, 150, 35.5); pdf.line(103, 42, 103, 72);
  } else {
    pdf.setFillColor(44, 13, 82); pdf.rect(7, 7, 196, 76, "F");
    pdf.setFillColor(76, 25, 119); pdf.circle(184, 13, 24, "F");
    pdf.setFillColor(229, 20, 112); pdf.circle(18, 15, 13, "F");
    pdf.setFillColor(0, 190, 199); pdf.circle(126, 10, 10, "F");
    pdf.setFillColor(255, 60, 119); pdf.circle(197, 77, 16, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
    pdf.text(quantity > 1 ? `${eventTitle.toUpperCase()}  —  GROUP PASS (${quantity} ATTENDEES)` : eventTitle.toUpperCase(), 18, 29, { maxWidth: 170 });
    pdf.setFontSize(8); pdf.text("EVENT GUIDELINES & ENTRY INSTRUCTIONS", 18, 37);
    pdf.setDrawColor(190, 166, 211); pdf.setLineWidth(.25); pdf.line(80, 35.5, 139, 35.5); pdf.line(103, 42, 103, 72);
  }

  const leftGuidelines = isVip ? [
    ["ticket", "Fast-Track Priority Entry: Skip regular queues via\nthe dedicated VIP Express Gate lane."],
    ["person", `VIP Hospitality: Access exclusive VIP Lounge with\ncomplimentary beverages and snacks.`],
    ["scan", "Present this digital or printed pass for quick scan.\nKeep your VIP wristband/lanyard on at all times."]
  ] : (quantity > 1 ? [
    ["ticket", `This single ticket admits all ${quantity} members\nof your registered group.`],
    ["person", `Attendees can enter together or arrive\nseparately at different times.`],
    ["scan", `Staff scans this same QR code and logs\neach member's entry incrementally.`]
  ] : [
    ["ticket", "Please keep this ticket until\nthe event ends."],
    ["person", "Entry is valid for one person only."],
    ["scan", "Show your QR code at the entry gate."]
  ]);

  const rightGuidelines = isVip ? [
    ["vip", "Prime Stage View: Access to reserved VIP seating\nor front-stage viewing enclosure."],
    ["bag", "Exclusive Welcome Pack: Collect your commemorative\nVIP laminate pass at the VIP concierge desk."],
    ["info", "For dedicated assistance, contact the VIP host\nat the VIP reception lounge."]
  ] : (quantity > 1 ? [
    ["no-entry", `Total entries allowed: ${quantity}. Once all ${quantity}\nhave entered, ticket is marked fully used.`],
    ["bag", "Keep your belongings and confirmation code safe."],
    ["info", "For partial check-in questions, contact gate staff."]
  ] : [
    ["no-entry", "No re-entry without authorization."],
    ["bag", "Keep your belongings safe."],
    ["info", "For assistance, contact the event\nhelp desk."]
  ]);

  [47, 57, 67].forEach((y, index) => {
    drawGuidelineIcon(pdf, 22, y, leftGuidelines[index][0], isVip);
    drawGuidelineIcon(pdf, 111, y, rightGuidelines[index][0], isVip);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.2);
    pdf.setTextColor(isVip ? 253 : 255, isVip ? 245 : 255, isVip ? 220 : 255);
    pdf.text(leftGuidelines[index][1].split("\n"), 29, y - 1);
    pdf.text(rightGuidelines[index][1].split("\n"), 118, y - 1);
  });

  pdf.setDrawColor(isVip ? 212 : 216, isVip ? 175 : 199, isVip ? 55 : 229);
  pdf.line(159, 65, 184, 65);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5);
  pdf.setTextColor(isVip ? 212 : 222, isVip ? 185 : 207, isVip ? 145 : 234);
  pdf.text("BOOKING REFERENCE", 160, 71);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255); pdf.text(booking.id || "REFERENCE", 160, 77);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5);
  pdf.setTextColor(isVip ? 212 : 222, isVip ? 185 : 207, isVip ? 145 : 234);
  pdf.text(isVip ? "VIP TICKET TIER" : "TOTAL TICKETS", 160, 52);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
  pdf.setTextColor(isVip ? 251 : 255, isVip ? 191 : 255, isVip ? 36 : 255);
  pdf.text(isVip ? `VIP (${quantity} Pass${quantity > 1 ? 'es' : ''})` : `${quantity} ${quantity === 1 ? 'Person' : 'Members'}`, 160, 58);

  const filename = `${booking.id || 'EVT-TICKET'}-Eventoria-tickets.pdf`;
  if (typeof document !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      const blob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try { document.body.removeChild(link); } catch {}
        URL.revokeObjectURL(blobUrl);
      }, 2000);
      return { success: true, filename };
    } catch {
      // fallback to pdf.save
    }
  }

  pdf.save(filename);
  return { success: true, filename };
}
