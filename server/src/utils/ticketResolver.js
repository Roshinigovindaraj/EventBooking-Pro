import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Ticket } from '../models/Ticket.js';
import { Booking } from '../models/Booking.js';

const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * Resolves a ticket from various inputs:
 * - QR credential token / hash
 * - QR JSON payload
 * - Ticket code (e.g. TKT-41D4AE1B5ADA)
 * - Booking reference (e.g. EVT-73453260FC, BOOKING EVT-73453260FC)
 * - Attendee ticket identifier (e.g. EVT-73453260FC-P01, EVT-73453260FC-P02)
 * - Ticket ObjectId
 */
export async function resolveTicket(input) {
  if (!input) return null;
  let str = String(input).trim();
  if (!str) return null;

  // 1. Check for JSON payload (e.g. scanned QR with JSON metadata)
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.credential) str = String(parsed.credential).trim();
      else if (parsed.ticketId) str = String(parsed.ticketId).trim();
      else if (parsed.code) str = String(parsed.code).trim();
      else if (parsed.bookingReference) str = String(parsed.bookingReference).trim();
    } catch {
      // not valid JSON, use raw string
    }
  }

  // 2. Check for URL format
  try {
    const url = new URL(str);
    const credParam = url.searchParams.get('credential');
    if (credParam) str = credParam.trim();
  } catch {
    // not a URL
  }

  // 3. Strip common user-typed prefixes
  str = str.replace(/^(booking|ticket|ref|reference)\s*[:#-]?\s*/i, '').trim();

  // 4. Try matching credentialHash (hashed input or raw 64-char hex hash)
  const hashedInput = crypto.createHash('sha256').update(str).digest('hex');
  let ticket = await Ticket.findOne({
    $or: [
      { credentialHash: hashedInput },
      ...( /^[a-f\d]{64}$/i.test(str) ? [{ credentialHash: str.toLowerCase() }] : [] ),
    ],
  }).select('+credentialHash');

  if (ticket) {
    const allBookingTickets = await Ticket.find({ booking: ticket.booking }).sort({ createdAt: 1 }).select('+credentialHash');
    return { ticket, allBookingTickets, method: 'credential' };
  }

  // 5. Try matching Ticket code (case-insensitive)
  ticket = await Ticket.findOne({
    code: { $regex: new RegExp(`^${escapeRegex(str)}$`, 'i') },
  }).select('+credentialHash');

  if (ticket) {
    const allBookingTickets = await Ticket.find({ booking: ticket.booking }).sort({ createdAt: 1 }).select('+credentialHash');
    return { ticket, allBookingTickets, method: 'ticket_code' };
  }

  // 6. Try matching Ticket ObjectId
  if (/^[a-f\d]{24}$/i.test(str) && mongoose.Types.ObjectId.isValid(str)) {
    ticket = await Ticket.findById(str).select('+credentialHash');
    if (ticket) {
      const allBookingTickets = await Ticket.find({ booking: ticket.booking }).sort({ createdAt: 1 }).select('+credentialHash');
      return { ticket, allBookingTickets, method: 'ticket_id' };
    }
  }

  // 7. Try matching Booking Reference (with optional -P01, -P02 attendee suffix)
  let bookingRef = str;
  let attendeeIndex = null;
  const attendeeMatch = str.match(/^(.*?)-P(\d+)$/i);
  if (attendeeMatch) {
    bookingRef = attendeeMatch[1];
    attendeeIndex = Math.max(0, parseInt(attendeeMatch[2], 10) - 1);
  }

  const booking = await Booking.findOne({
    $or: [
      { bookingReference: { $regex: new RegExp(`^${escapeRegex(bookingRef)}$`, 'i') } },
      ...( /^[a-f\d]{24}$/i.test(bookingRef) && mongoose.Types.ObjectId.isValid(bookingRef) ? [{ _id: bookingRef }] : [] ),
    ],
  });

  if (booking) {
    const tickets = await Ticket.find({ booking: booking._id }).sort({ createdAt: 1 }).select('+credentialHash');
    if (tickets.length > 0) {
      let selected = null;
      if (attendeeIndex !== null && tickets[attendeeIndex]) {
        selected = tickets[attendeeIndex];
      } else {
        selected = tickets.find(t => t.status === 'issued') || tickets[0];
      }
      return { ticket: selected, allBookingTickets: tickets, booking, method: 'booking_reference' };
    }
  }

  return null;
}
