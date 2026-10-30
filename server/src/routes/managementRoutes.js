import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { Booking } from '../models/Booking.js';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { StaffAssignment } from '../models/StaffAssignment.js';
import { VenueReservation } from '../models/VenueReservation.js';
import { OperationalTask } from '../models/OperationalTask.js';
import { AuditLog } from '../models/AuditLog.js';
import { Wishlist } from '../models/Wishlist.js';
import { AppError, notFound } from '../utils/errors.js';
import { CATEGORY_NAMES, EVENT_CATEGORIES } from '../config/eventCategories.js';

const router = Router();
router.use(['/organizer', '/venue-owner'], authenticate);
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const eventImage = z.string().url().max(2000);
const eventFields = z.object({ title: z.string().trim().min(3).max(160), description: z.string().min(20).max(10000), category: z.enum(CATEGORY_NAMES), subcategory: z.string().refine(value => EVENT_CATEGORIES.some(group => group.subcategories.includes(value)), 'Unknown event subcategory'), venue: z.string().regex(/^[a-f\d]{24}$/i).optional(), venueName: z.string().trim().max(160).optional(), city: z.string().min(2).max(100), address: z.string().max(300).optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), timezone: z.string().default('Asia/Kolkata'), images: z.array(eventImage).max(10).default([]), terms: z.string().max(5000).optional(), benefits: z.array(z.string().max(200)).max(20).default([]), faqs: z.array(z.object({ question: z.string().min(2).max(300), answer: z.string().min(2).max(1000) })).max(30).default([]), ticketTypes: z.array(z.object({ name: z.string().min(1).max(80), priceMinor: z.number().int().min(0), currency: z.string().length(3).default('INR'), capacity: z.number().int().positive(), minPerOrder: z.number().int().positive().default(1), maxPerOrder: z.number().int().positive().default(10), salesStart: z.string().datetime().optional(), salesEnd: z.string().datetime().optional() })).min(1) });
const validateCategoryPair = (value, ctx) => { if (!value.category || !value.subcategory) return; const group = EVENT_CATEGORIES.find(item => item.name === value.category); if (group && !group.subcategories.includes(value.subcategory)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['subcategory'], message: `${value.subcategory} does not belong to ${value.category}` }); };
const eventBody = eventFields.superRefine(validateCategoryPair);
const eventUpdateBody = eventFields.partial().superRefine(validateCategoryPair);
router.get('/organizer/events', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => { try { const filter = req.user.roles.some(r => ['admin','super_admin'].includes(r)) ? {} : { organizer: req.user.id }; res.json({ items: await Event.find(filter).populate('organizer', 'name email').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.post('/organizer/events', authorize('event_organizer', 'admin', 'super_admin'), validate(z.object({ body: eventBody })), async (req, res, next) => { try { const { city, address, ...body } = req.body; if (new Date(body.endsAt) <= new Date(body.startsAt)) throw new AppError(422, 'INVALID_DATES', 'Event end must be after its start'); const base = slugify(body.title); const slug = `${base}-${Date.now().toString(36)}`; res.status(201).json({ event: await Event.create({ ...body, location: { city, address }, slug, organizer: req.user.id }) }); } catch (e) { next(e); } });
router.patch('/organizer/events/:id', authorize('event_organizer', 'admin', 'super_admin'), validate(z.object({ body: eventUpdateBody })), async (req, res, next) => { try { const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r)); const filter = isPrivileged ? { _id: req.params.id } : { _id: req.params.id, organizer: req.user.id }; const event = await Event.findOne(filter); if (!event) throw notFound('Editable event not found'); const { city, address, ...body } = req.body; Object.assign(event, body); if (city || address !== undefined) event.location = { city: city || event.location.city, address: address ?? event.location.address }; await event.save(); res.json({ event }); } catch (e) { next(e); } });
router.delete('/organizer/events/:id', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const event = await Event.findById(req.params.id);
    if (!event) throw notFound('Event not found');

    if (!isPrivileged && String(event.organizer) !== String(req.user.id)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this event.');
    }

    await Event.deleteOne({ _id: event._id });
    await StaffAssignment.deleteMany({ event: event._id });
    await Wishlist.deleteMany({ item: event._id, itemModel: 'Event' });

    try {
      await AuditLog.create({
        actor: req.user.id,
        action: 'event.deleted',
        resourceType: 'Event',
        resourceId: event._id,
        metadata: {
          title: event.title,
          deletedBy: isPrivileged ? 'admin' : 'organizer'
        }
      });
    } catch (logErr) {
      console.error('AuditLog error:', logErr);
    }

    res.json({
      success: true,
      message: `Event "${event.title}" has been successfully deleted.`
    });
  } catch (e) {
    next(e);
  }
});
router.post('/organizer/events/:id/submit', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const filter = isPrivileged
      ? { _id: req.params.id, status: { $in: ['draft', 'rejected'] } }
      : { _id: req.params.id, organizer: req.user.id, status: { $in: ['draft', 'rejected'] } };
    const event = await Event.findOneAndUpdate(
      filter,
      { status: 'pending_review', approvalFeedback: null },
      { new: true }
    );
    if (!event) throw notFound('Submittable event not found');
    res.json({ event });
  } catch (e) { next(e); }
});
router.get('/organizer/bookings', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const filter = {};
    if (!isPrivileged) {
      const ids = await Event.find({ organizer: req.user.id }).distinct('_id');
      filter.event = { $in: ids };
    }
    if (req.query.eventId) filter.event = req.query.eventId;
    if (req.query.status) filter.status = req.query.status;
    res.json({ items: await Booking.find(filter).populate('event', 'title startsAt').populate('customer', 'name email').sort({ createdAt: -1 }) });
  } catch (e) { next(e); }
});
router.get('/organizer/events/:id/attendees', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const filter = isPrivileged ? { _id: req.params.id } : { _id: req.params.id, organizer: req.user.id };
    const event = await Event.findOne(filter);
    if (!event) throw notFound('Event not found');
    const items = await Ticket.find({ event: event.id }).populate('owner', 'name email').populate('booking', 'bookingReference quantity status paymentStatus').sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});
router.get('/organizer/event-staff', authorize('event_organizer', 'admin', 'super_admin'), async (_req, res, next) => { try { res.json({ items: await User.find({ roles: 'event_staff', status: 'active' }).select('name email').sort({ name: 1 }) }); } catch (e) { next(e); } });
router.get('/organizer/events/:id/staff', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const event = await Event.findOne(isPrivileged ? { _id: req.params.id } : { _id: req.params.id, organizer: req.user.id });
    if (!event) throw notFound('Event not found');
    const items = await StaffAssignment.find({ event: event.id, scopeType: 'event', status: 'active' }).populate('staff', 'name email').sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});
router.post('/organizer/events/:id/staff', authorize('event_organizer', 'admin', 'super_admin'), validate(z.object({ body: z.object({ staffId: z.string().regex(/^[a-f\d]{24}$/i) }) })), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const event = await Event.findOne(isPrivileged ? { _id: req.params.id } : { _id: req.params.id, organizer: req.user.id });
    if (!event) throw notFound('Event not found');
    const staff = await User.findOne({ _id: req.body.staffId, roles: 'event_staff', status: 'active' });
    if (!staff) throw notFound('Active event staff member not found');
    const assignment = await StaffAssignment.findOneAndUpdate({ staff: staff.id, scopeType: 'event', event: event.id }, { assignedBy: req.user.id, permissions: ['event_preparation', 'ticket_check_in', 'attendance_view', 'event_completion'], status: 'active' }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.status(201).json({ assignment });
  } catch (e) { next(e); }
});
router.delete('/organizer/events/:id/staff/:staffId', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const event = await Event.findOne(isPrivileged ? { _id: req.params.id } : { _id: req.params.id, organizer: req.user.id });
    if (!event) throw notFound('Event not found');
    await StaffAssignment.findOneAndUpdate({ staff: req.params.staffId, event: event.id, scopeType: 'event' }, { status: 'revoked' });
    res.json({ success: true, message: 'Staff assignment revoked.' });
  } catch (e) { next(e); }
});
router.get('/organizer/reports', authorize('event_organizer', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const filter = isPrivileged ? {} : { organizer: req.user.id };
    const events = await Event.find(filter).select('title status ticketTypes');
    const ids = events.map(item => item._id);
    const bookings = await Booking.find({ event: { $in: ids } });
    const confirmed = bookings.filter(item => ['confirmed', 'refunded'].includes(item.status));
    const grossMinor = confirmed.reduce((sum, item) => sum + item.totalMinor, 0);
    const refundedMinor = confirmed.filter(item => item.status === 'refunded' || item.paymentStatus === 'refunded').reduce((sum, item) => sum + item.totalMinor, 0);
    const checkedIn = await Ticket.countDocuments({ event: { $in: ids }, status: 'checked_in' });
    const commissionMinor = Math.round(grossMinor * .1);
    res.json({ report: { events: events.length, publishedEvents: events.filter(item => item.status === 'published').length, bookings: confirmed.reduce((sum, item) => sum + item.quantity, 0), checkedIn, grossMinor, refundedMinor, commissionMinor, netMinor: grossMinor - refundedMinor - commissionMinor } });
  } catch (e) { next(e); }
});
router.patch('/organizer/events/:id/visibility', authorize('event_organizer', 'admin', 'super_admin'), validate(z.object({ body: z.object({ paused: z.boolean() }) })), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const filter = isPrivileged
      ? { _id: req.params.id, status: req.body.paused ? 'published' : 'suspended' }
      : { _id: req.params.id, organizer: req.user.id, status: req.body.paused ? 'published' : 'suspended' };
    const event = await Event.findOne(filter);
    if (!event) throw notFound('Event cannot change visibility');
    event.status = req.body.paused ? 'suspended' : 'published';
    event.pausedAt = req.body.paused ? new Date() : null;
    await event.save();
    res.json({ event });
  } catch (e) { next(e); }
});
router.post('/organizer/bookings/:id/refund', authorize('event_organizer', 'admin', 'super_admin'), validate(z.object({ body: z.object({ decision: z.enum(['approved', 'rejected']), feedback: z.string().max(1000).optional() }) })), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const filter = { _id: req.params.id, refundStatus: 'requested' };
    if (!isPrivileged) {
      const ids = await Event.find({ organizer: req.user.id }).distinct('_id');
      filter.event = { $in: ids };
    }
    const booking = await Booking.findOne(filter);
    if (!booking) throw notFound('Pending refund request not found');
    booking.refundStatus = req.body.decision;
    booking.refundFeedback = req.body.feedback;
    if (req.body.decision === 'approved') {
      booking.refundStatus = 'processed';
      booking.status = 'refunded';
      booking.paymentStatus = 'refunded';
      booking.refundedAt = new Date();
      await Ticket.updateMany({ booking: booking.id, status: 'issued' }, { status: 'refunded' });
    }
    await booking.save();
    res.json({ booking });
  } catch (e) { next(e); }
});

const venueBody = z.object({ name: z.string().trim().min(2).max(160), description: z.string().min(5).max(10000), type: z.string().min(2).max(80), city: z.string().min(2).max(100), address: z.string().max(300).optional(), timezone: z.string().default('Asia/Kolkata'), capacity: z.number().int().positive(), amenities: z.array(z.string().max(80)).max(50).default([]), images: z.array(z.string().url()).max(10).default([]), priceMinorPerHour: z.number().int().min(0), currency: z.string().length(3).default('INR'), manualApproval: z.boolean().default(false), operatingHours: z.string().max(200).optional(), availableDays: z.string().max(100).optional(), minBookingHours: z.number().int().positive().optional() });
router.get('/venue-owner/venues', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => { try { const filter = req.user.roles.some(r => ['admin','super_admin'].includes(r)) ? {} : { owner: req.user.id }; res.json({ items: await Venue.find(filter).populate('owner', 'name email').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.post('/venue-owner/venues', authorize('venue_owner', 'admin', 'super_admin'), validate(z.object({ body: venueBody })), async (req, res, next) => {
  try {
    const { city, address, ...body } = req.body;
    const venue = await Venue.create({
      ...body,
      location: { city, address },
      slug: `${slugify(body.name)}-${Date.now().toString(36)}`,
      owner: req.user.id
    });
    res.status(201).json({ venue });
  } catch (e) { next(e); }
});
router.post('/venue-owner/venues/:id/submit', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const filter = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r))
      ? { _id: req.params.id, status: { $in: ['draft', 'rejected'] } }
      : { _id: req.params.id, owner: req.user.id, status: { $in: ['draft', 'rejected'] } };
    const venue = await Venue.findOneAndUpdate(filter, { status: 'pending_review', approvalFeedback: null }, { new: true });
    if (!venue) throw notFound('Submittable venue not found');
    res.json({ venue });
  } catch (e) { next(e); }
});
router.patch('/venue-owner/venues/:id', authorize('venue_owner', 'admin', 'super_admin'), validate(z.object({ body: venueBody.partial() })), async (req, res, next) => {
  try {
    const isPlatformAdmin = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r));
    const filter = isPlatformAdmin ? { _id: req.params.id } : { _id: req.params.id, owner: req.user.id };
    const venue = await Venue.findOne(filter);
    if (!venue) throw notFound('Venue not found');
    const { city, address, ...body } = req.body;
    Object.assign(venue, body);
    if (city !== undefined || address !== undefined) {
      venue.location = {
        city: city !== undefined ? city : venue.location?.city,
        address: address !== undefined ? address : venue.location?.address
      };
    }
    await venue.save();
    res.json({ venue });
  } catch (e) { next(e); }
});
router.delete('/venue-owner/venues/:id', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPrivileged = req.user.roles.some(r => ['admin', 'super_admin'].includes(r));
    const venue = await Venue.findById(req.params.id);
    if (!venue) throw notFound('Venue not found');

    if (!isPrivileged && String(venue.owner) !== String(req.user.id)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this venue.');
    }

    await Venue.deleteOne({ _id: venue._id });
    await VenueReservation.deleteMany({ venue: venue._id });
    await OperationalTask.deleteMany({ venue: venue._id });
    await Wishlist.deleteMany({ item: venue._id, itemModel: 'Venue' });
    await Event.updateMany({ venue: venue._id }, { $unset: { venue: 1 } });

    try {
      await AuditLog.create({
        actor: req.user.id,
        action: 'venue.deleted',
        resourceType: 'Venue',
        resourceId: venue._id,
        metadata: {
          name: venue.name,
          deletedBy: isPrivileged ? 'admin' : 'venue_owner'
        }
      });
    } catch (logErr) {
      console.error('AuditLog error:', logErr);
    }

    res.json({
      success: true,
      message: `Venue "${venue.name}" has been successfully deleted.`
    });
  } catch (e) {
    next(e);
  }
});
router.get('/venue-owner/reservations', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPlatformAdmin = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r));
    const venueFilter = isPlatformAdmin ? {} : { owner: req.user.id };
    const ids = await Venue.find(venueFilter).distinct('_id');
    const items = await VenueReservation.find({ venue: { $in: ids } })
      .populate('venue', 'name location images priceMinorPerHour currency owner')
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

router.post('/venue-owner/reservations/:id/confirm', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const reservation = await VenueReservation.findById(req.params.id).populate('venue');
    if (!reservation) throw notFound('Reservation not found');
    const isPlatformAdmin = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r));
    const isOwner = String(reservation.venue?.owner) === String(req.user.id);
    if (!isPlatformAdmin && !isOwner) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this venue.');
    }

    const conflict = await VenueReservation.exists({
      _id: { $ne: reservation._id },
      venue: reservation.venue._id,
      status: 'confirmed',
      startsAt: { $lt: reservation.endsAt },
      endsAt: { $gt: reservation.startsAt },
    });
    if (conflict) {
      throw new AppError(409, 'SLOT_ALREADY_CONFIRMED', 'Another reservation is already confirmed for this venue in the selected time range.');
    }

    reservation.status = 'confirmed';
    reservation.ownerNotes = req.body.notes?.trim() || 'Confirmed by venue owner. Date and time are available.';
    reservation.reviewedAt = new Date();
    reservation.reviewedBy = req.user.id;
    await reservation.save();

    try {
      const venueStaff = await User.findOne({ roles: 'venue_staff', status: 'active' });
      if (venueStaff) {
        const venueName = reservation.venue?.name || 'Venue';
        const defaultTasks = [
          { title: `Pre-event Hall & Layout Setup: ${reservation.purpose}`, notes: `Arrange floor setup, tables, chairs, and stage at ${venueName}.` },
          { title: `A/V & Stage Lighting Readiness Check`, notes: `Verify sound systems, microphones, and backup power generator.` },
          { title: `Catering Access & Facilities Coordination`, notes: `Open service entry, inspect kitchen water supply and waste disposal.` },
          { title: `Guest Reception & Parking Protocol`, notes: `Coordinate gate security and parking directions for ${reservation.purpose}.` },
        ];
        await OperationalTask.insertMany(defaultTasks.map(t => ({
          venue: reservation.venue?._id || reservation.venue,
          reservation: reservation._id,
          assignee: venueStaff._id,
          title: t.title,
          notes: t.notes,
          status: 'todo',
        })));
      }
    } catch (taskErr) {
      console.error('Could not auto-generate venue staff operational tasks:', taskErr);
    }

    res.json({ reservation });
  } catch (e) { next(e); }
});

router.post('/venue-owner/reservations/:id/reject', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const reservation = await VenueReservation.findById(req.params.id).populate('venue');
    if (!reservation) throw notFound('Reservation not found');
    const isPlatformAdmin = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r));
    const isOwner = String(reservation.venue?.owner) === String(req.user.id);
    if (!isPlatformAdmin && !isOwner) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this venue.');
    }

    const notes = req.body.notes?.trim();
    reservation.status = 'rejected';
    reservation.ownerNotes = notes || 'Date and time is unavailable. Request cancelled by venue owner.';
    reservation.reviewedAt = new Date();
    reservation.reviewedBy = req.user.id;
    await reservation.save();

    res.json({ reservation });
  } catch (e) { next(e); }
});

router.get('/venue-owner/staff', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const staff = await User.find({ roles: 'venue_staff', status: 'active' }).select('name email');
    res.json({ items: staff });
  } catch (e) { next(e); }
});

router.get('/venue-owner/tasks', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const isPlatformAdmin = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r));
    let venueFilter = {};
    if (!isPlatformAdmin) {
      const myVenues = await Venue.find({ owner: req.user.id }).select('_id');
      venueFilter = { venue: { $in: myVenues.map(v => v._id) } };
    }
    const tasks = await OperationalTask.find(venueFilter)
      .populate('venue', 'name location')
      .populate('reservation', 'purpose reference startsAt endsAt')
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });
    res.json({ items: tasks });
  } catch (e) { next(e); }
});

router.post('/venue-owner/tasks', authorize('venue_owner', 'admin', 'super_admin'), validate(z.object({
  body: z.object({
    venueId: z.string().regex(/^[a-f\d]{24}$/i),
    reservationId: z.string().regex(/^[a-f\d]{24}$/i).optional().nullable(),
    assigneeId: z.string().regex(/^[a-f\d]{24}$/i),
    title: z.string().trim().min(3).max(180),
    notes: z.string().max(2000).optional(),
  })
})), async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.body.venueId);
    if (!venue) throw notFound('Venue not found');
    const isPlatformAdmin = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r));
    if (!isPlatformAdmin && String(venue.owner) !== String(req.user.id)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this venue.');
    }
    const assignee = await User.findById(req.body.assigneeId);
    if (!assignee || !assignee.roles.includes('venue_staff')) {
      throw new AppError(404, 'STAFF_NOT_FOUND', 'Active venue staff member not found.');
    }

    const task = await OperationalTask.create({
      venue: venue.id,
      reservation: req.body.reservationId || null,
      assignee: assignee.id,
      title: req.body.title.trim(),
      notes: req.body.notes ? req.body.notes.trim() : '',
      status: 'todo',
    });

    const populated = await OperationalTask.findById(task.id)
      .populate('venue', 'name')
      .populate('reservation', 'purpose reference startsAt endsAt')
      .populate('assignee', 'name email');

    res.status(201).json({ task: populated });
  } catch (e) { next(e); }
});

router.delete('/venue-owner/tasks/:id', authorize('venue_owner', 'admin', 'super_admin'), async (req, res, next) => {
  try {
    const task = await OperationalTask.findById(req.params.id).populate('venue');
    if (!task) throw notFound('Task not found');
    const isPlatformAdmin = req.user.roles?.some(r => ['admin', 'super_admin'].includes(r));
    if (!isPlatformAdmin && String(task.venue?.owner) !== String(req.user.id)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this task.');
    }
    await OperationalTask.deleteOne({ _id: task.id });
    res.json({ result: 'deleted', id: task.id });
  } catch (e) { next(e); }
});

export default router;

