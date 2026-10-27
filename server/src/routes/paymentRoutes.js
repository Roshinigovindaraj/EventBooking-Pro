import crypto from 'node:crypto';
import mongoose from 'mongoose';
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

async function finalizeBooking({ bookingId, customerId }) {
  const session = await mongoose.startSession();
  try {
    let confirmedBooking;
    let issuedTickets = [];
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ _id: bookingId, customer: customerId, status: 'pending_payment', reservationExpiresAt: { $gt: new Date() } }).session(session);
      if (!booking) throw new AppError(409, 'BOOKING_NOT_PAYABLE', 'Booking is unavailable, expired, or already processed');
      const event = await Event.findOneAndUpdate(
        { _id: booking.event, 'ticketTypes._id': booking.ticketTypeId, 'ticketTypes.reserved': { $gte: booking.quantity } },
        { $inc: { 'ticketTypes.$.reserved': -booking.quantity, 'ticketTypes.$.sold': booking.quantity } },
        { new: true, session },
      );
      if (!event) throw new AppError(409, 'INVENTORY_FINALIZATION_FAILED', 'Booking inventory could not be finalized');
      booking.status = 'confirmed';
      booking.paymentStatus = 'successful';
      await booking.save({ session });
      confirmedBooking = booking;
      const credential = crypto.randomBytes(32).toString('base64url');
      const code = `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      const [ticket] = await Ticket.create([{
        booking: booking.id,
        event: booking.event,
        owner: customerId,
        code,
        credentialHash: hash(credential),
        admitCount: booking.quantity || 1,
        checkedInCount: 0,
        status: 'issued',
        checkIns: []
      }], { session });
      issuedTickets.push({
        id: ticket.id,
        code: ticket.code,
        credential,
        admitCount: booking.quantity || 1,
        checkedInCount: 0
      });
    });
    return { booking: confirmedBooking, tickets: issuedTickets };
  } finally { await session.endSession(); }
}

const razorpayOrder = z.object({ body: z.object({
  bookingId: z.string().regex(/^[a-f\d]{24}$/i),
}) });
const razorpayVerification = z.object({ body: z.object({
  bookingId: z.string().regex(/^[a-f\d]{24}$/i),
  orderId: z.string().startsWith('order_'),
  paymentId: z.string().startsWith('pay_'),
  signature: z.string().regex(/^[a-f\d]{64}$/i),
}) });

router.post('/payments/razorpay/order', authenticate, validate(razorpayOrder), async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.body.bookingId, customer: req.user.id, status: 'pending_payment', reservationExpiresAt: { $gt: new Date() } });
    if (!booking) throw notFound('Active pending booking not found');
    if (env.PAYMENT_MODE === 'mock') {
      return res.json({ order: { provider: 'mock', id: `order_mock_${crypto.randomUUID()}`, amount: booking.totalMinor, currency: booking.currency } });
    }
    const authorization = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { authorization: `Basic ${authorization}`, 'content-type': 'application/json' },
      body: JSON.stringify({ amount: booking.totalMinor, currency: booking.currency, receipt: booking.bookingReference.slice(0, 40) }),
    });
    const order = await response.json().catch(() => ({}));
    if (!response.ok) {
      const authenticationFailed = response.status === 401 || /auth/i.test(order.error?.description || '');
      throw new AppError(
        502,
        authenticationFailed ? 'RAZORPAY_AUTHENTICATION_FAILED' : 'RAZORPAY_ORDER_FAILED',
        authenticationFailed
          ? 'Razorpay rejected the API credentials. Generate a matching Test Key ID and Test Key Secret in the Razorpay Dashboard, update server/.env, and restart the server.'
          : order.error?.description || 'Unable to create Razorpay order',
      );
    }
    return res.status(201).json({ order: { provider: 'razorpay', ...order }, keyId: env.RAZORPAY_KEY_ID });
  } catch (error) { return next(error); }
});

router.post('/payments/razorpay/verify', authenticate, validate(razorpayVerification), async (req, res, next) => {
  try {
    if (env.PAYMENT_MODE !== 'provider') throw new AppError(400, 'PAYMENT_MODE_MISMATCH', 'Razorpay verification is unavailable in mock mode');
    const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${req.body.orderId}|${req.body.paymentId}`).digest('hex');
    const actualBuffer = Buffer.from(req.body.signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'Razorpay payment verification failed');
    }
    const finalized = await finalizeBooking({ bookingId: req.body.bookingId, customerId: req.user.id });
    return res.json({ verified: true, paymentId: req.body.paymentId, orderId: req.body.orderId, ...finalized });
  } catch (error) { return next(error); }
});

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
    const finalized = await finalizeBooking({ bookingId: req.body.bookingId, customerId: req.user.id });
    res.json({ ...finalized, warning: 'Confirmed by development-only mock payment' });
  } catch (e) { next(e); }
});
export default router;

