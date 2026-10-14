import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Booking } from '../models/Booking.js';
import { VenueReservation } from '../models/VenueReservation.js';
import { Wishlist } from '../models/Wishlist.js';
import { createEventBooking, createVenueReservation } from '../services/bookingService.js';
import { notFound } from '../utils/errors.js';

const router = Router();
router.use(['/users', '/bookings', '/venue-reservations', '/wishlist'], authenticate);
router.get('/users/me', (req, res) => res.json({ user: req.user }));
router.patch('/users/me', validate(z.object({ body: z.object({ name: z.string().trim().min(2).max(80) }) })), async (req, res, next) => { try { req.user.name = req.body.name; await req.user.save(); res.json({ user: req.user }); } catch (e) { next(e); } });

router.get('/bookings/me', async (req, res, next) => { try { res.json({ items: await Booking.find({ customer: req.user.id }).populate('event', 'title startsAt images').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.post('/bookings', validate(z.object({ body: z.object({ eventId: z.string().regex(/^[a-f\d]{24}$/i), ticketTypeId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().min(1).max(20) }) })), async (req, res, next) => { try { res.status(201).json({ booking: await createEventBooking({ customerId: req.user.id, ...req.body }) }); } catch (e) { next(e); } });
router.get('/bookings/:id', async (req, res, next) => { try { const booking = await Booking.findOne({ _id: req.params.id, customer: req.user.id }).populate('event'); if (!booking) throw notFound('Booking not found'); res.json({ booking }); } catch (e) { next(e); } });

router.post('/venue-reservations', validate(z.object({ body: z.object({ venueId: z.string().regex(/^[a-f\d]{24}$/i), startsAt: z.string().datetime(), endsAt: z.string().datetime(), purpose: z.string().trim().min(3).max(300) }) })), async (req, res, next) => { try { res.status(201).json({ reservation: await createVenueReservation({ customerId: req.user.id, ...req.body }) }); } catch (e) { next(e); } });
router.get('/venue-reservations/me', async (req, res, next) => { try { res.json({ items: await VenueReservation.find({ customer: req.user.id }).populate('venue', 'name location images').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });

router.get('/wishlist', async (req, res, next) => { try { res.json({ items: await Wishlist.find({ user: req.user.id }).populate('item') }); } catch (e) { next(e); } });
router.post('/wishlist', validate(z.object({ body: z.object({ itemType: z.enum(['event', 'venue']), itemId: z.string().regex(/^[a-f\d]{24}$/i) }) })), async (req, res, next) => { try { const itemModel = req.body.itemType === 'event' ? 'Event' : 'Venue'; const item = await Wishlist.findOneAndUpdate({ user: req.user.id, itemType: req.body.itemType, item: req.body.itemId }, { $setOnInsert: { itemModel } }, { upsert: true, new: true }); res.status(201).json({ item }); } catch (e) { next(e); } });
router.delete('/wishlist/:id', async (req, res, next) => { try { const result = await Wishlist.deleteOne({ _id: req.params.id, user: req.user.id }); if (!result.deletedCount) throw notFound('Wishlist item not found'); res.status(204).end(); } catch (e) { next(e); } });
export default router;

