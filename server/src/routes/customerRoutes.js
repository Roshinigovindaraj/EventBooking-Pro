import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Ticket } from '../models/Ticket.js';
import { VenueReservation } from '../models/VenueReservation.js';
import { Wishlist } from '../models/Wishlist.js';
import { createEventBooking, createVenueReservation } from '../services/bookingService.js';
import { AppError, notFound } from '../utils/errors.js';

const router = Router();
router.use(['/users', '/bookings', '/venue-reservations', '/wishlist'], authenticate);
router.get('/users/me', (req, res) => res.json({ user: req.user }));
router.patch('/users/me', validate(z.object({ body: z.object({ name: z.string().trim().min(2).max(80) }) })), async (req, res, next) => { try { req.user.name = req.body.name; await req.user.save(); res.json({ user: req.user }); } catch (e) { next(e); } });

router.get('/bookings/me', async (req, res, next) => { try { res.json({ items: await Booking.find({ customer: req.user.id }).populate('event', 'title startsAt endsAt images venueName location ticketTypes').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.post('/bookings', validate(z.object({ body: z.object({ eventId: z.string().regex(/^[a-f\d]{24}$/i), ticketTypeId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().min(1).max(20) }) })), async (req, res, next) => { try { res.status(201).json({ booking: await createEventBooking({ customerId: req.user.id, ...req.body }) }); } catch (e) { next(e); } });
router.get('/bookings/:id', async (req, res, next) => { try { const booking = await Booking.findOne({ _id: req.params.id, customer: req.user.id }).populate('event'); if (!booking) throw notFound('Booking not found'); res.json({ booking }); } catch (e) { next(e); } });
router.patch('/bookings/:id/cancel', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let cancelledBooking;
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ _id: req.params.id, customer: req.user.id }).populate('event').session(session);
      if (!booking) throw notFound('Booking not found');
      if (!['pending_payment', 'confirmed'].includes(booking.status)) throw new AppError(409, 'BOOKING_NOT_CANCELLABLE', 'This booking can no longer be cancelled');
      if (booking.event?.startsAt <= new Date()) throw new AppError(409, 'EVENT_ALREADY_STARTED', 'Bookings cannot be cancelled after the event starts');
      if (await Ticket.exists({ booking: booking.id, status: 'checked_in' }).session(session)) throw new AppError(409, 'TICKET_ALREADY_USED', 'A checked-in booking cannot be cancelled');

      const inventoryField = booking.status === 'confirmed' ? 'ticketTypes.$.sold' : 'ticketTypes.$.reserved';
      const inventory = await Event.updateOne(
        { _id: booking.event._id, 'ticketTypes._id': booking.ticketTypeId, [inventoryField]: { $gte: booking.quantity } },
        { $inc: { [inventoryField]: -booking.quantity } },
        { session },
      );
      if (!inventory.modifiedCount) throw new AppError(409, 'INVENTORY_RELEASE_FAILED', 'Booking inventory could not be released');

      booking.status = 'cancelled';
      booking.paymentStatus = booking.paymentStatus === 'successful' ? 'refunded' : 'cancelled';
      await booking.save({ session });
      await Ticket.updateMany({ booking: booking.id, status: 'issued' }, { status: booking.paymentStatus === 'refunded' ? 'refunded' : 'cancelled' }, { session });
      cancelledBooking = booking;
    });
    res.json({ booking: cancelledBooking });
  } catch (e) { next(e); }
  finally { await session.endSession(); }
});
router.post('/bookings/:id/refund-request', validate(z.object({ body: z.object({ reason: z.string().trim().min(5).max(1000) }) })), async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user.id, status: 'confirmed', paymentStatus: 'successful', refundStatus: { $in: ['none', 'rejected'] } });
    if (!booking) throw new AppError(409, 'REFUND_NOT_AVAILABLE', 'This booking is not eligible for a refund request');
    booking.refundStatus = 'requested'; booking.refundReason = req.body.reason; booking.refundRequestedAt = new Date(); booking.refundFeedback = null;
    await booking.save(); res.json({ booking });
  } catch (e) { next(e); }
});

router.post('/venue-reservations', validate(z.object({
  body: z.object({
    venueId: z.string().regex(/^[a-f\d]{24}$/i),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    purpose: z.string().trim().min(3).max(300),
    customerNotes: z.string().trim().max(1000).optional(),
  })
})), async (req, res, next) => {
  try {
    res.status(201).json({ reservation: await createVenueReservation({ customerId: req.user.id, ...req.body }) });
  } catch (e) { next(e); }
});

router.get('/venue-reservations/me', async (req, res, next) => {
  try {
    res.json({
      items: await VenueReservation.find({ customer: req.user.id })
        .populate('venue', 'name location images priceMinorPerHour contactEmail contactPhone')
        .sort({ createdAt: -1 })
    });
  } catch (e) { next(e); }
});

router.patch('/venue-reservations/:id/cancel', async (req, res, next) => {
  try {
    const reservation = await VenueReservation.findOne({ _id: req.params.id, customer: req.user.id });
    if (!reservation) throw notFound('Venue reservation not found');
    if (['cancelled', 'rejected'].includes(reservation.status)) {
      throw new AppError(409, 'ALREADY_CANCELLED', 'Reservation is already cancelled');
    }
    reservation.status = 'cancelled';
    await reservation.save();
    res.json({ reservation });
  } catch (e) { next(e); }
});

router.get('/wishlist', async (req, res, next) => { try { res.json({ items: await Wishlist.find({ user: req.user.id }).populate('item').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.post('/wishlist', validate(z.object({ body: z.object({ itemType: z.enum(['event', 'venue']), itemId: z.string().regex(/^[a-f\d]{24}$/i) }) })), async (req, res, next) => { try { const itemModel = req.body.itemType === 'event' ? 'Event' : 'Venue'; const item = await Wishlist.findOneAndUpdate({ user: req.user.id, itemType: req.body.itemType, item: req.body.itemId }, { $setOnInsert: { itemModel } }, { upsert: true, new: true }); res.status(201).json({ item }); } catch (e) { next(e); } });
router.delete('/wishlist/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjectId = /^[a-f\d]{24}$/i.test(id);
    if (!isObjectId) throw notFound('Wishlist item not found');
    const result = await Wishlist.deleteOne({
      user: req.user.id,
      $or: [{ _id: id }, { item: id }]
    });
    if (!result.deletedCount) throw notFound('Wishlist item not found');
    res.status(204).end();
  } catch (e) { next(e); }
});
export default router;

