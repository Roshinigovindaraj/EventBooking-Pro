import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Ticket } from '../models/Ticket.js';
import { AppError, notFound } from '../utils/errors.js';

const router = Router();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

router.post('/payments/create-order', authenticate, validate(z.object({ body: z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i) }) })), async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.body.bookingId, customer: req.user.id, status: 'pending_payment', reservationExpiresAt: { $gt: new Date() } });
    if (!booking) throw notFound('Active pending booking not found');
    if (env.PAYMENT_MODE !== 'mock') throw new AppError(501, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'A live payment provider is not configured');
    res.json({ order: { provider: 'development_mock', bookingId: booking.id, amountMinor: booking.totalMinor, currency: booking.currency, warning: 'Development-only mock payment; no real funds are processed' } });
  } catch (e) { next(e); }
});

router.post('/payments/mock-confirm', authenticate, validate(z.object({ body: z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i) }) })), async (req, res, next) => {
  try {
    if (env.NODE_ENV === 'production' || env.PAYMENT_MODE !== 'mock') throw new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found');
    const booking = await Booking.findOneAndUpdate({ _id: req.body.bookingId, customer: req.user.id, status: 'pending_payment', reservationExpiresAt: { $gt: new Date() } }, { status: 'confirmed', paymentStatus: 'successful' }, { new: true });
    if (!booking) throw new AppError(409, 'BOOKING_NOT_PAYABLE', 'Booking is unavailable, expired, or already processed');
    const event = await Event.findOneAndUpdate({ _id: booking.event, 'ticketTypes._id': booking.ticketTypeId, 'ticketTypes.reserved': { $gte: booking.quantity } }, { $inc: { 'ticketTypes.$.reserved': -booking.quantity, 'ticketTypes.$.sold': booking.quantity } }, { new: true });
    if (!event) throw new AppError(409, 'INVENTORY_FINALIZATION_FAILED', 'Booking inventory could not be finalized');
    const tickets = [];
    for (let i = 0; i < booking.quantity; i += 1) {
      const credential = crypto.randomBytes(32).toString('base64url');
      const code = `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const ticket = await Ticket.findOneAndUpdate({ booking: booking.id, code }, { $setOnInsert: { event: booking.event, owner: req.user.id, credentialHash: hash(credential), status: 'issued' } }, { upsert: true, new: true });
      tickets.push({ id: ticket.id, code: ticket.code, credential });
    }
    res.json({ booking, tickets, warning: 'Confirmed by development-only mock payment' });
  } catch (e) { next(e); }
});
export default router;

