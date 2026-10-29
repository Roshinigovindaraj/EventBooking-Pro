import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Application } from '../models/Application.js';
import { AuditLog } from '../models/AuditLog.js';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { StaffAssignment } from '../models/StaffAssignment.js';
import { Venue } from '../models/Venue.js';
import { Wishlist } from '../models/Wishlist.js';
import { VenueReservation } from '../models/VenueReservation.js';
import { OperationalTask } from '../models/OperationalTask.js';
import { User, ROLES } from '../models/User.js';
import { notFound, AppError } from '../utils/errors.js';

const router = Router();
router.use(['/admin', '/super-admin'], authenticate, authorize('admin', 'super_admin'));
const review = z.object({ body: z.object({ decision: z.enum(['approved', 'rejected']), feedback: z.string().max(1000).optional() }) });

router.get('/admin/applications', async (req, res, next) => { try { res.json({ items: await Application.find(req.query.status ? { status: req.query.status } : {}).populate('applicant', 'name email roles status').sort({ createdAt: 1 }) }); } catch (e) { next(e); } });
router.post('/admin/applications/:id/review', validate(review), async (req, res, next) => {
    try {
        let application = await Application.findOne({ _id: req.params.id, status: 'pending' });
        if (!application) {
            application = await Application.findById(req.params.id);
            if (!application) throw notFound('Pending application not found');
            if (application.status === req.body.decision) {
                if (application.status === 'approved') {
                    const role = application.type === 'organizer' ? 'event_organizer' : 'venue_owner';
                    const applicantId = application.applicant?._id || application.applicant;
                    await User.updateOne({ _id: applicantId }, { $addToSet: { roles: role } });
                    if (application.type === 'venue_owner' && application.details?.venueName) {
                        const d = application.details;
                        const existing = await Venue.findOne({ owner: applicantId, name: d.venueName });
                        if (!existing) {
                            const slug = String(d.venueName).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
                            await Venue.create({
                                name: d.venueName,
                                slug,
                                description: d.description || 'Premier venue for events and celebrations.',
                                type: d.type || 'Banquet Halls',
                                location: { city: d.city || 'Chennai', address: d.address || '' },
                                capacity: Number(d.capacity) || 200,
                                amenities: Array.isArray(d.amenities) ? d.amenities : (d.amenities ? String(d.amenities).split(',').map(s => s.trim()).filter(Boolean) : []),
                                images: d.image ? [d.image] : [],
                                priceMinorPerHour: Math.round((Number(d.pricePerHour) || 10000) * 100),
                                currency: 'INR',
                                owner: applicantId,
                                status: 'published'
                            });
                        }
                    }
                }
                return res.json({ application, message: `Application was already ${application.status}` });
            }
            throw new AppError(409, 'ALREADY_REVIEWED', `Application has already been ${application.status}`);
        }
        application.status = req.body.decision;
        application.feedback = req.body.feedback;
        application.reviewer = req.user.id;
        application.reviewedAt = new Date();
        await application.save();
        if (application.status === 'approved') {
            const role = application.type === 'organizer' ? 'event_organizer' : 'venue_owner';
            const applicantId = application.applicant?._id || application.applicant;
            await User.updateOne({ _id: applicantId }, { $addToSet: { roles: role } });
            if (application.type === 'venue_owner' && application.details?.venueName) {
                const d = application.details;
                const existing = await Venue.findOne({ owner: applicantId, name: d.venueName });
                if (!existing) {
                    const slug = String(d.venueName).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
                    await Venue.create({
                        name: d.venueName,
                        slug,
                        description: d.description || 'Premier venue for events and celebrations.',
                        type: d.type || 'Banquet Halls',
                        location: { city: d.city || 'Chennai', address: d.address || '' },
                        capacity: Number(d.capacity) || 200,
                        amenities: Array.isArray(d.amenities) ? d.amenities : (d.amenities ? String(d.amenities).split(',').map(s => s.trim()).filter(Boolean) : []),
                        images: d.image ? [d.image] : [],
                        priceMinorPerHour: Math.round((Number(d.pricePerHour) || 10000) * 100),
                        currency: 'INR',
                        owner: applicantId,
                        status: 'published'
                    });
                }
            }
        }
        await AuditLog.create({ actor: req.user.id, action: `application.${application.status}`, resourceType: 'Application', resourceId: application.id });
        res.json({ application });
    } catch (e) { next(e); }
});

for (const [path, Model] of [['events', Event], ['venues', Venue]]) {
    router.post(`/admin/${path}/:id/review`, validate(review), async (req, res, next) => {
        try {
            let item = await Model.findOne({ _id: req.params.id, status: 'pending_review' });
            if (!item) {
                item = await Model.findById(req.params.id);
                if (!item) throw notFound(`Pending ${path.replace(/s$/, '')} not found`);
                const targetStatus = req.body.decision === 'approved' ? 'published' : 'rejected';
                if (item.status === targetStatus || item.status === 'published') {
                    if (path === 'venues' && item.owner && req.body.decision === 'approved') {
                        await User.updateOne({ _id: item.owner }, { $addToSet: { roles: 'venue_owner' } });
                    }
                    return res.json({ item, message: `Listing is already ${item.status}` });
                }
            }
            item.status = req.body.decision === 'approved' ? 'published' : 'rejected';
            item.approvalFeedback = req.body.feedback;
            if (item.status === 'published') {
                if (path === 'events') {
                    item.publishedAt = new Date();
                } else if (path === 'venues' && item.owner) {
                    await User.updateOne({ _id: item.owner }, { $addToSet: { roles: 'venue_owner' } });
                }
            }
            await item.save();
            await AuditLog.create({ actor: req.user.id, action: `${path}.${item.status}`, resourceType: Model.modelName, resourceId: item.id });
            res.json({ item });
        } catch (e) { next(e); }
    });
}

router.get('/admin/users', async (req, res, next) => { try { const filter = req.query.q ? { $or: [{ name: new RegExp(String(req.query.q), 'i') }, { email: new RegExp(String(req.query.q), 'i') }] } : {}; res.json({ items: await User.find(filter).limit(100).sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.patch('/admin/users/:id/status', validate(z.object({ body: z.object({ status: z.enum(['active', 'suspended']) }) })), async (req, res, next) => { try { if (String(req.user.id) === req.params.id && req.body.status === 'suspended') throw new AppError(409, 'SELF_SUSPEND', 'You cannot suspend your own account'); const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }); if (!user) throw notFound('User not found'); await AuditLog.create({ actor: req.user.id, action: `user.${req.body.status}`, resourceType: 'User', resourceId: user.id }); res.json({ user }); } catch (e) { next(e); } });
router.patch('/super-admin/users/:id/roles', authorize('super_admin'), validate(z.object({ body: z.object({ roles: z.array(z.enum(ROLES)).min(1) }) })), async (req, res, next) => { try { const user = await User.findByIdAndUpdate(req.params.id, { roles: req.body.roles }, { new: true }); if (!user) throw notFound('User not found'); await AuditLog.create({ actor: req.user.id, action: 'user.roles_updated', resourceType: 'User', resourceId: user.id, metadata: { roles: req.body.roles } }); res.json({ user }); } catch (e) { next(e); } });
router.get('/admin/events', async (_req, res, next) => {
  try {
    const events = await Event.find().populate('organizer', 'name email').sort({ createdAt: -1 }).lean();
    const eventIds = events.map(e => e._id);
    const confirmedBookings = await Booking.find({
      event: { $in: eventIds },
      status: 'confirmed'
    }).select('event ticketTypeId quantity').lean();

    const now = new Date();
    const items = events.map(ev => {
      const isCompleted = new Date(ev.endsAt) <= now;
      const evBookings = confirmedBookings.filter(b => String(b.event) === String(ev._id));
      const ticketTypes = (ev.ticketTypes || []).map(t => {
        const capacity = Number(t.capacity) || 0;
        const realSold = evBookings
          .filter(b => String(b.ticketTypeId) === String(t._id))
          .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        const sold = Math.max(Number(t.sold) || 0, realSold);
        const remaining = Math.max(0, capacity - sold);
        return { ...t, sold, remaining, isSoldOut: remaining === 0 };
      });
      const totalCapacity = ticketTypes.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
      const totalSold = ticketTypes.reduce((acc, t) => acc + (Number(t.sold) || 0), 0);
      const remainingTickets = Math.max(0, totalCapacity - totalSold);
      const isSoldOut = totalCapacity > 0 && remainingTickets === 0;

      return {
        ...ev,
        ticketTypes,
        totalCapacity,
        totalSold,
        remainingTickets,
        isSoldOut,
        isCompleted
      };
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.delete('/admin/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) throw notFound('Event not found');

    const isCompleted = new Date(event.endsAt) <= new Date();

    await Event.deleteOne({ _id: event._id });
    await StaffAssignment.deleteMany({ event: event._id });
    await Wishlist.deleteMany({ item: event._id, itemModel: 'Event' });

    await AuditLog.create({
      actor: req.user.id,
      action: 'event.deleted',
      resourceType: 'Event',
      resourceId: event._id,
      metadata: {
        title: event.title,
        isCompleted,
        endsAt: event.endsAt
      }
    });

    res.json({
      success: true,
      message: `Event "${event.title}" has been successfully removed.`
    });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/venues', async (_req, res, next) => {
  try {
    const venues = await Venue.find().populate('owner', 'name email').sort({ createdAt: -1 }).lean();
    res.json({ items: venues });
  } catch (e) {
    next(e);
  }
});

router.delete('/admin/venues/:id', async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) throw notFound('Venue not found');

    await Venue.deleteOne({ _id: venue._id });
    await VenueReservation.deleteMany({ venue: venue._id });
    await OperationalTask.deleteMany({ venue: venue._id });
    await Wishlist.deleteMany({ item: venue._id, itemModel: 'Venue' });
    await Event.updateMany({ venue: venue._id }, { $unset: { venue: 1 } });

    await AuditLog.create({
      actor: req.user.id,
      action: 'venue.deleted',
      resourceType: 'Venue',
      resourceId: venue._id,
      metadata: {
        name: venue.name,
        city: venue.location?.city
      }
    });

    res.json({
      success: true,
      message: `Venue "${venue.name}" has been successfully removed.`
    });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/audit-logs', async (_req, res, next) => { try { res.json({ items: await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(200) }); } catch (e) { next(e); } });
export default router;

