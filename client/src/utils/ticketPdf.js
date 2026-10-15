import QRCode from "qrcode";

export const ticketQrPayload = (booking, attendeeNumber = 1) => JSON.stringify({
  type: "eventoria-ticket",
  ticketId: `${booking.id}-P${String(attendeeNumber).padStart(2, "0")}`,
  attendeeNumber,
  bookingId: booking.id,
  eventId: booking.eventId,
  event: booking.title,
  date: booking.date,
  time: booking.time,
  ticketType: booking.ticketType || "General Admission",
  quantity: booking.quantity || 1,
  paymentId: booking.paymentId || null,
  status: booking.status,
});

export async function downloadEventTickets(booking) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [210, 90] });
  const paid = String(booking.price || "Paid").replace("₹", "Rs.");
  const quantity = Number(booking.quantity) || 1;
  const ticketType = booking.ticketType || "General Admission";

  for (let attendee = 1; attendee <= quantity; attendee += 1) {
    if (attendee > 1) pdf.addPage([210, 90], "landscape");
    const ticketId = `${booking.id}-P${String(attendee).padStart(2, "0")}`;
    const qr = await QRCode.toDataURL(ticketQrPayload(booking, attendee), { errorCorrectionLevel: "H", margin: 2, width: 600 });

    pdf.setFillColor(239, 241, 246); pdf.rect(0, 0, 210, 90, "F");
    pdf.setFillColor(37, 15, 72); pdf.roundedRect(7, 7, 196, 76, 3, 3, "F");
    pdf.setFillColor(69, 23, 112); pdf.circle(38, 44, 35, "F");
    pdf.setFillColor(211, 28, 125); pdf.circle(18, 16, 15, "F");
    pdf.setFillColor(0, 189, 197); pdf.circle(116, 13, 9, "F");
    pdf.setFillColor(255, 74, 125); pdf.circle(126, 76, 14, "F");

    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
    pdf.text("EVENTORIA  /  LIVE EXPERIENCE", 16, 18);
    pdf.setFontSize(21);
    const titleLines = pdf.splitTextToSize(booking.title.toUpperCase(), 105);
    pdf.text(titleLines, 16, 36);
    const infoY = Math.min(59, 38 + titleLines.length * 8);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
    pdf.text(`${booking.date}  /  ${booking.time}`, 16, infoY);
    pdf.text(`${booking.venue}, ${booking.city}`, 16, infoY + 6);
    pdf.setFontSize(6.5); pdf.setTextColor(218, 205, 234);
    pdf.text(`BOOKING ${booking.id}   |   ORDER TOTAL ${paid}`, 16, 76);

    pdf.setFillColor(255, 250, 253); pdf.rect(145, 7, 58, 76, "F");
    pdf.setDrawColor(92, 46, 122); pdf.setLineDashPattern([1.2, 1.5], 0); pdf.line(145, 10, 145, 80); pdf.setLineDashPattern([], 0);
    pdf.setFillColor(239, 241, 246); pdf.circle(145, 7, 3.2, "F"); pdf.circle(145, 83, 3.2, "F");
    pdf.setTextColor(55, 29, 78); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
    pdf.text("ADMIT ONE", 153, 16);
    pdf.setFontSize(6); pdf.setTextColor(126, 100, 141);
    pdf.text("GATE", 153, 25); pdf.text("ROW", 170, 25); pdf.text("TICKET", 187, 25);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(55, 29, 78);
    pdf.text("01", 153, 31);
    pdf.text(ticketType === "General Admission" ? "GA" : ticketType.slice(0, 3).toUpperCase(), 170, 31);
    pdf.text(String(attendee).padStart(2, "0"), 187, 31);
    pdf.setFillColor(255, 255, 255); pdf.roundedRect(158, 35, 32, 32, 2, 2, "F");
    pdf.addImage(qr, "PNG", 160, 37, 28, 28);
    pdf.setFontSize(6.5); pdf.setTextColor(55, 29, 78); pdf.text("SCAN FOR ENTRY", 174, 72, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.text(ticketId, 174, 77, { align: "center" });
  }

  pdf.save(`${booking.id}-Eventoria-tickets.pdf`);
}
