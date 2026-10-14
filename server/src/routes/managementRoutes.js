import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { Booking } from '../models/Booking.js';
import { VenueReservation } from '../models/VenueReservation.js';
import { AppError, notFound } from '../utils/errors.js';
import { CATEGORY_NAMES, EVENT_CATEGORIES } from '../config/eventCategories.js';

const router = Router();
router.use(['/organizer', '/venue-owner'], authenticate);
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const eventFields = z.object({ title: z.string().trim().min(3).max(160), description: z.string().min(20).max(10000), category: z.enum(CATEGORY_NAMES), subcategory: z.string().refine(value => EVENT_CATEGORIES.some(group => group.subcategories.includes(value)), 'Unknown event subcategory'), venue: z.string().regex(/^[a-f\d]{24}$/i).optional(), venueName: z.string().trim().max(160).optional(), city: z.string().min(2).max(100), address: z.string().max(300).optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), timezone: z.string().default('Asia/Kolkata'), images: z.array(z.string().url()).max(10).default([]), ticketTypes: z.array(z.object({ name: z.string().min(1).max(80), priceMinor: z.number().int().min(0), currency: z.string().length(3).default('INR'), capacity: z.number().int().positive(), minPerOrder: z.number().int().positive().default(1), maxPerOrder: z.number().int().positive().default(10), salesStart: z.string().datetime().optional(), salesEnd: z.string().datetime().optional() })).min(1) });
const validateCategoryPair = (value, ctx) => { if (!value.category || !value.subcategory) return; const group = EVENT_CATEGORIES.find(item => item.name === value.category); if (group && !group.subcategories.includes(value.subcategory)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['subcategory'], message: `${value.subcategory} does not belong to ${value.category}` }); };
const eventBody = eventFields.superRefine(validateCategoryPair);
const eventUpdateBody = eventFields.partial().superRefine(validateCategoryPair);
router.get('/organizer/events', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => { try { const filter = req.user.roles.some(r => ['admin','super_admin'].includes(r)) ? {} : { organizer: req.user.id }; res.json({ items: await Event.find(filter).sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.post('/organizer/events', authorize('event_organizer'), validate(z.object({ body: eventBody })), async (req, res, next) => { try { const { city, address, ...body } = req.body; if (new Date(body.endsAt) <= new Date(body.startsAt)) throw new AppError(422, 'INVALID_DATES', 'Event end must be after its start'); const base = slugify(body.title); const slug = `${base}-${Date.now().toString(36)}`; res.status(201).json({ event: await Event.create({ ...body, location: { city, address }, slug, organizer: req.user.id }) }); } catch (e) { next(e); } });
router.patch('/organizer/events/:id', authorize('event_organizer'), validate(z.object({ body: eventUpdateBody })), async (req, res, next) => { try { const event = await Event.findOne({ _id: req.params.id, organizer: req.user.id, status: { $in: ['draft', 'rejected'] } }); if (!event) throw notFound('Editable event not found'); Object.assign(event, req.body); await event.save(); res.json({ event }); } catch (e) { next(e); } });
router.post('/organizer/events/:id/submit', authorize('event_organizer'), async (req, res, next) => { try { const event = await Event.findOneAndUpdate({ _id: req.params.id, organizer: req.user.id, status: { $in: ['draft', 'rejected'] } }, { status: 'pending_review', approvalFeedback: null }, { new: true }); if (!event) throw notFound('Submittable event not found'); res.json({ event }); } catch (e) { next(e); } });
router.get('/organizer/bookings', authorize('event_organizer'), async (req, res, next) => { try { const ids = await Event.find({ organizer: req.user.id }).distinct('_id'); res.json({ items: await Booking.find({ event: { $in: ids } }).populate('event', 'title startsAt').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });

const venueBody = z.object({ name: z.string().trim().min(3).max(160), description: z.string().min(20).max(10000), type: z.string().min(2).max(80), city: z.string().min(2).max(100), address: z.string().max(300).optional(), timezone: z.string().default('Asia/Kolkata'), capacity: z.number().int().positive(), amenities: z.array(z.string().max(80)).max(50).default([]), images: z.array(z.string().url()).max(10).default([]), priceMinorPerHour: z.number().int().min(0), currency: z.string().length(3).default('INR'), manualApproval: z.boolean().default(false) });
router.get('/venue-owner/venues', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => { try { const filter = req.user.roles.some(r => ['admin','super_admin'].includes(r)) ? {} : { owner: req.user.id }; res.json({ items: await Venue.find(filter).sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.post('/venue-owner/venues', authorize('venue_owner'), validate(z.object({ body: venueBody })), async (req, res, next) => { try { const { city, address, ...body } = req.body; res.status(201).json({ venue: await Venue.create({ ...body, location: { city, address }, slug: `${slugify(body.name)}-${Date.now().toString(36)}`, owner: req.user.id }) }); } catch (e) { next(e); } });
router.post('/venue-owner/venues/:id/submit', authorize('venue_owner'), async (req, res, next) => { try { const venue = await Venue.findOneAndUpdate({ _id: req.params.id, owner: req.user.id, status: { $in: ['draft', 'rejected'] } }, { status: 'pending_review', approvalFeedback: null }, { new: true }); if (!venue) throw notFound('Submittable venue not found'); res.json({ venue }); } catch (e) { next(e); } });
router.get('/venue-owner/reservations', authorize('venue_owner'), async (req, res, next) => { try { const ids = await Venue.find({ owner: req.user.id }).distinct('_id'); res.json({ items: await VenueReservation.find({ venue: { $in: ids } }).populate('venue', 'name').sort({ startsAt: 1 }) }); } catch (e) { next(e); } });
export default router;

