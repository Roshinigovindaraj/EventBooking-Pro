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

const drawTicketBase = (pdf) => {
  pdf.setFillColor(246, 248, 252); pdf.rect(0, 0, 210, 90, "F");
  pdf.setFillColor(38, 12, 73); pdf.roundedRect(7, 7, 196, 76, 3, 3, "F");
  pdf.setFillColor(66, 20, 108); pdf.circle(42, 43, 35, "F");
  pdf.setFillColor(229, 20, 112); pdf.circle(18, 15, 15, "F");
  pdf.setFillColor(0, 190, 199); pdf.circle(119, 12, 9, "F");
  pdf.setFillColor(255, 60, 119); pdf.circle(132, 78, 15, "F");
};

const drawGuidelineIcon = (pdf, x, y, kind) => {
  pdf.setDrawColor(255, 255, 255); pdf.setLineWidth(.35); pdf.circle(x, y, 3.2, "S");
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
    pdf.setFillColor(255, 255, 255); pdf.rect(x-.65, y-.65, .55, .55, "F"); pdf.rect(x+.25, y-.55, .5, .5, "F"); pdf.rect(x-.35, y+.25, .55, .55, "F");
  } else if (kind === "no-entry") {
    pdf.line(x - 1.4, y, x + 1.1, y); pdf.line(x + .5, y - .65, x + 1.2, y); pdf.line(x + .5, y + .65, x + 1.2, y);
    pdf.line(x - 1.55, y - 1.55, x + 1.55, y + 1.55);
  } else if (kind === "bag") {
    pdf.roundedRect(x - 1.35, y - .7, 2.7, 2.25, .25, .25, "S");
    pdf.line(x - .7, y - .7, x - .45, y - 1.35); pdf.line(x - .45, y - 1.35, x + .45, y - 1.35); pdf.line(x + .45, y - 1.35, x + .7, y - .7);
  } else if (kind === "info") {
    pdf.setFillColor(255, 255, 255); pdf.circle(x, y - 1.25, .23, "F");
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
  const customerName = String(booking.customerName || booking.userName || "Ticket Holder").trim();
  const eventTitle = String(booking.title || booking.venue || "Eventoria Experience").trim();
  const venueText = String(booking.venue || booking.city || "Venue").trim();
  const cityText = String(booking.city || "").trim();
  const venueLine = cityText && !venueText.includes(cityText) ? `${venueText}, ${cityText}` : venueText;
  const timeLine = String(booking.time || "Scheduled Time").trim();
  const dateLine = String(booking.date || "Scheduled Date").trim();
  const isVenue = Boolean(booking.isVenueReservation);

  for (let attendee = 1; attendee <= quantity; attendee += 1) {
    if (attendee > 1) pdf.addPage([210, 90], "landscape");
    const ticketId = `${booking.id || "EVT"}-P${String(attendee).padStart(2, "0")}`;
    const qr = await QRCode.toDataURL(ticketQrPayload(booking, attendee), { errorCorrectionLevel: "M", margin: 4, width: 800 });

    drawTicketBase(pdf);

    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
    pdf.text(isVenue ? "EVENTORIA  /  VENUE RESERVATION" : "EVENTORIA  /  LIVE EXPERIENCE", 16, 18);
    pdf.setFontSize(21);
    const titleLines = pdf.splitTextToSize(eventTitle.toUpperCase(), 105);
    pdf.text(titleLines, 16, 36);
    const infoY = Math.min(59, 38 + titleLines.length * 8);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
    pdf.text(`${dateLine}  /  ${timeLine}`, 16, infoY);
    pdf.text(venueLine, 16, infoY + 6);
    pdf.setFontSize(6.5); pdf.setTextColor(218, 205, 234);
    pdf.text(`BOOKING ${booking.id || "REFERENCE"}   |   ORDER TOTAL ${paid}`, 16, 76);

    pdf.setFillColor(255, 250, 253); pdf.rect(145, 7, 58, 76, "F");
    pdf.setDrawColor(92, 46, 122); pdf.setLineDashPattern([1.2, 1.5], 0); pdf.line(145, 10, 145, 80); pdf.setLineDashPattern([], 0);
    pdf.setFillColor(239, 241, 246); pdf.circle(145, 7, 3.2, "F"); pdf.circle(145, 83, 3.2, "F");
    pdf.setTextColor(55, 29, 78); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
    pdf.text("ADMIT ONE", 153, 14);
    pdf.setFontSize(5); pdf.setTextColor(126, 100, 141); pdf.text("TICKET HOLDER", 153, 19);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(55, 29, 78);
    pdf.text(pdf.splitTextToSize(customerName, 40)[0], 153, 23.5);
    pdf.setFontSize(5.5); pdf.setTextColor(126, 100, 141);
    pdf.text("GATE", 153, 28); pdf.text("ROW", 170, 28); pdf.text("TICKET", 187, 28);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(55, 29, 78);
    pdf.text("01", 153, 34);
    pdf.text(ticketType === "General Admission" ? "GA" : ticketType.slice(0, 3).toUpperCase(), 170, 34);
    pdf.text(String(attendee).padStart(2, "0"), 187, 34);
    pdf.setFillColor(255, 255, 255); pdf.roundedRect(157, 36, 34, 34, 2, 2, "F");
    pdf.addImage(qr, "PNG", 158, 37, 32, 32);
    pdf.setFontSize(6.5); pdf.setTextColor(55, 29, 78); pdf.text("SCAN FOR ENTRY", 174, 74, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.text(ticketId, 174, 79, { align: "center" });

    // Back side: one matching reverse page for every attendee ticket.
    pdf.addPage([210, 90], "landscape");
    drawTicketBase(pdf);
    pdf.setFillColor(44, 13, 82); pdf.rect(7, 7, 196, 76, "F");
    pdf.setFillColor(76, 25, 119); pdf.circle(184, 13, 24, "F");
    pdf.setFillColor(229, 20, 112); pdf.circle(18, 15, 13, "F");
    pdf.setFillColor(0, 190, 199); pdf.circle(126, 10, 10, "F");
    pdf.setFillColor(255, 60, 119); pdf.circle(197, 77, 16, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17);
    pdf.text(eventTitle.toUpperCase(), 18, 29, { maxWidth: 170 });
    pdf.setFontSize(8); pdf.text("EVENT GUIDELINES", 18, 37);
    pdf.setDrawColor(190, 166, 211); pdf.setLineWidth(.25); pdf.line(51, 35.5, 139, 35.5); pdf.line(103, 42, 103, 72);

    const leftGuidelines = [["ticket", "Please keep this ticket until\nthe event ends."], ["person", "Entry is valid for one person only."], ["scan", "Show your QR code at the entry gate."]];
    const rightGuidelines = [["no-entry", "No re-entry without authorization."], ["bag", "Keep your belongings safe."], ["info", "For assistance, contact the event\nhelp desk."]];
    [47, 57, 67].forEach((y, index) => {
      drawGuidelineIcon(pdf, 22, y, leftGuidelines[index][0]); drawGuidelineIcon(pdf, 111, y, rightGuidelines[index][0]);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(255, 255, 255);
      pdf.text(leftGuidelines[index][1].split("\n"), 29, y - 1); pdf.text(rightGuidelines[index][1].split("\n"), 118, y - 1);
    });
    pdf.setDrawColor(216, 199, 229); pdf.line(159, 65, 184, 65);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.setTextColor(222, 207, 234); pdf.text("BOOKING REFERENCE", 160, 71);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(255, 255, 255); pdf.text(booking.id || "REFERENCE", 160, 77);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.setTextColor(222, 207, 234); pdf.text("TICKET HOLDER", 160, 52);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.setTextColor(255, 255, 255); pdf.text(pdf.splitTextToSize(customerName, 34)[0], 160, 58);
  }

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
