import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { VenueReservation } from '../models/VenueReservation.js';
import { AppError } from '../utils/errors.js';

const reference = prefix => `${prefix}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

export async function createEventBooking({ customerId, eventId, ticketTypeId, quantity }) {
  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      const now = new Date();
      const event = await Event.findOne({ _id: eventId, status: 'published', endsAt: { $gt: now } }).session(session);
      const type = event?.ticketTypes.id(ticketTypeId);
      if (!event || !type) throw new AppError(404, 'TICKET_TYPE_NOT_FOUND', 'Bookable event or ticket type not found');
      if (quantity < type.minPerOrder || quantity > type.maxPerOrder) throw new AppError(422, 'INVALID_QUANTITY', `Quantity must be between ${type.minPerOrder} and ${type.maxPerOrder}`);
      if ((type.salesStart && type.salesStart > now) || (type.salesEnd && type.salesEnd < now)) throw new AppError(409, 'SALES_CLOSED', 'Ticket sales are not open');

      // Check real-time confirmed bookings sales
      const confirmedBookings = await Booking.find({
        event: event._id,
        ticketTypeId: type._id,
        status: 'confirmed',
      }).session(session);
      const realSold = confirmedBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
      const effectiveSold = Math.max(type.sold || 0, realSold);
      const available = Math.max(0, (type.capacity || 0) - effectiveSold - (type.reserved || 0));

      if (available <= 0) {
        throw new AppError(409, 'SOLD_OUT', 'All tickets for this event tier are sold out. No more tickets can be booked.');
      }
      if (available < quantity) {
        throw new AppError(409, 'INSUFFICIENT_TICKETS', `Only ${available} ticket(s) remaining for this tier.`);
      }

      const reserved = await Event.updateOne(
        { _id: event.id, 'ticketTypes._id': type.id, $expr: { $lte: [{ $add: [{ $arrayElemAt: ['$ticketTypes.reserved', { $indexOfArray: ['$ticketTypes._id', type._id] }] }, { $arrayElemAt: ['$ticketTypes.sold', { $indexOfArray: ['$ticketTypes._id', type._id] }] }, quantity] }, { $arrayElemAt: ['$ticketTypes.capacity', { $indexOfArray: ['$ticketTypes._id', type._id] }] }] } },
        { $inc: { 'ticketTypes.$.reserved': quantity } }, { session }
      );
      if (!reserved.modifiedCount) throw new AppError(409, 'SOLD_OUT', 'There are not enough tickets available');
      const feeMinor = Math.round(type.priceMinor * quantity * 0.05);
      [created] = await Booking.create([{
        customer: customerId, event: event.id, ticketTypeId: type.id, quantity,
        unitPriceMinor: type.priceMinor, subtotalMinor: type.priceMinor * quantity,
        feeMinor, totalMinor: type.priceMinor * quantity + feeMinor, currency: type.currency,
        reservationExpiresAt: new Date(Date.now() + 15 * 60_000), bookingReference: reference('EVT'),
      }], { session });
    });
    return created;
  } finally { await session.endSession(); }
}

export async function createVenueReservation({ customerId, venueId, startsAt, endsAt, purpose, customerNotes = '' }) {
  const start = new Date(startsAt); const end = new Date(endsAt);
  if (start <= new Date() || end <= start) throw new AppError(422, 'INVALID_TIME_RANGE', 'Reservation must be for a valid future time range');
  const venue = await Venue.findOne({ _id: venueId, status: 'published' });
  if (!venue) throw new AppError(404, 'VENUE_NOT_FOUND', 'Bookable venue not found');
  const conflict = await VenueReservation.exists({
    venue: venue.id,
    status: 'confirmed',
    startsAt: { $lt: end },
    endsAt: { $gt: start },
  });
  if (conflict) throw new AppError(409, 'VENUE_UNAVAILABLE', 'The venue is already booked and confirmed for that time range');
  const hours = Math.ceil((end - start) / 3_600_000);
  return VenueReservation.create({
    customer: customerId,
    venue: venue.id,
    startsAt: start,
    endsAt: end,
    purpose,
    customerNotes: customerNotes ? customerNotes.trim() : '',
    totalMinor: hours * venue.priceMinorPerHour,
    currency: venue.currency,
    status: 'pending_approval',
    reservationExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    reference: reference('VEN'),
  });
}

