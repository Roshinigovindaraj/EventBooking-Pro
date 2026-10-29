import { Router } from 'express';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { User } from '../models/User.js';
import { EVENT_CATEGORIES } from '../config/eventCategories.js';
import { notFound } from '../utils/errors.js';

const router = Router();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/events', async (req, res, next) => {
  try {
    const now = new Date();
    // Keep an approved event discoverable while it is in progress or upcoming.
    let filter = { status: 'published' };
    if (req.query.category) filter.category = new RegExp(`^${escapeRegex(String(req.query.category))}$`, 'i');
    if (req.query.subcategory) filter.subcategory = new RegExp(`^${escapeRegex(String(req.query.subcategory))}$`, 'i');
    if (req.query.location) filter['location.city'] = new RegExp(escapeRegex(String(req.query.location)), 'i');
    if (req.query.organizer) {
      const organizerIds = await User.find({ name: new RegExp(escapeRegex(String(req.query.organizer)), 'i'), roles: 'event_organizer' }).distinct('_id');
      filter.organizer = { $in: organizerIds };
    }
    if (req.query.venue) {
      const venueIds = await Venue.find({ name: new RegExp(escapeRegex(String(req.query.venue)), 'i') }).distinct('_id');
      filter.$or = [{ venue: { $in: venueIds } }, { venueName: new RegExp(escapeRegex(String(req.query.venue)), 'i') }];
    }
    if (req.query.q) {
      const query = String(req.query.q).trim();
      const naturalLanguageMatch = query.match(/^(.+?)\s+events?\s+in\s+(.+)$/i);
      const searchText = naturalLanguageMatch ? naturalLanguageMatch[1] : query;
      if (naturalLanguageMatch && !req.query.location) filter['location.city'] = new RegExp(escapeRegex(naturalLanguageMatch[2].trim()), 'i');
      const words = searchText.replace(/\bevents?\b/gi, ' ').split(/\s+/).filter(Boolean);
      const expression = new RegExp(words.map(escapeRegex).join('|'), 'i');
      const organizerIds = await User.find({ name: expression, roles: 'event_organizer' }).distinct('_id');
      const venueIds = await Venue.find({ name: expression }).distinct('_id');
      filter.$or = [
        { title: expression }, { category: expression }, { subcategory: expression },
        { 'location.city': expression }, { venueName: expression },
        { organizer: { $in: organizerIds } }, { venue: { $in: venueIds } },
      ];
    }

    const sort = req.query.sort === 'date_desc' ? { startsAt: -1 } : { startsAt: 1 };
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));

    // Prefer upcoming/in-progress events first
    let queryFilter = { ...filter };
    if (req.query.scope !== 'all' && !req.query.includePast) {
      queryFilter.endsAt = { $gte: now };
    }

    let [items, total] = await Promise.all([
      Event.find(queryFilter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Event.countDocuments(queryFilter)
    ]);

    // Fallback: If no upcoming events match and no specific search was performed,
    // show recent published events so home page & catalog never show empty broken states
    if (items.length === 0 && !req.query.q && !req.query.category && !req.query.location && !req.query.subcategory) {
      const fallbackFilter = { status: 'published' };
      [items, total] = await Promise.all([
        Event.find(fallbackFilter).sort({ startsAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Event.countDocuments(fallbackFilter)
      ]);
    }

    const eventIds = items.map(ev => ev._id);
    const confirmedBookings = await Booking.find({
      event: { $in: eventIds },
      status: 'confirmed'
    }).select('event ticketTypeId quantity').lean();

    const computedItems = items.map(ev => {
      const evBookings = confirmedBookings.filter(b => String(b.event) === String(ev._id));
      const ticketTypes = (ev.ticketTypes || []).map(t => {
        const capacity = Number(t.capacity) || 0;
        const realSold = evBookings
          .filter(b => String(b.ticketTypeId) === String(t._id))
          .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        const sold = Math.max(Number(t.sold) || 0, realSold);
        const reserved = Number(t.reserved) || 0;
        const remaining = Math.max(0, capacity - sold - reserved);
        return { ...t, sold, remaining, isSoldOut: remaining === 0 };
      });
      const totalCapacity = ticketTypes.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
      const totalSold = ticketTypes.reduce((acc, t) => acc + (Number(t.sold) || 0), 0);
      const totalReserved = ticketTypes.reduce((acc, t) => acc + (Number(t.reserved) || 0), 0);
      const remainingTickets = Math.max(0, totalCapacity - totalSold - totalReserved);
      const isCompleted = ev.endsAt ? new Date(ev.endsAt) <= now : false;
      return {
        ...ev,
        ticketTypes,
        totalCapacity,
        totalSold,
        remainingTickets,
        isSoldOut: remainingTickets === 0,
        isCompleted,
      };
    });

    res.json({ items: computedItems, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/events/:id', async (req, res, next) => {
  try {
    const item = await Event.findOne({ $or: [{ _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }, { slug: req.params.id }], status: 'published' }).lean();
    if (!item) throw notFound('Event not found');

    const confirmedBookings = await Booking.find({
      event: item._id,
      status: 'confirmed'
    }).select('ticketTypeId quantity').lean();

    const ticketTypes = (item.ticketTypes || []).map(t => {
      const capacity = Number(t.capacity) || 0;
      const realSold = confirmedBookings
        .filter(b => String(b.ticketTypeId) === String(t._id))
        .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
      const sold = Math.max(Number(t.sold) || 0, realSold);
      const reserved = Number(t.reserved) || 0;
      const remaining = Math.max(0, capacity - sold - reserved);
      return { ...t, sold, remaining, isSoldOut: remaining === 0 };
    });
    const totalCapacity = ticketTypes.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);
    const totalSold = ticketTypes.reduce((acc, t) => acc + (Number(t.sold) || 0), 0);
    const totalReserved = ticketTypes.reduce((acc, t) => acc + (Number(t.reserved) || 0), 0);
    const remainingTickets = Math.max(0, totalCapacity - totalSold - totalReserved);

    res.json({
      item: {
        ...item,
        ticketTypes,
        totalCapacity,
        totalSold,
        remainingTickets,
        isSoldOut: remainingTickets === 0,
      }
    });
  } catch (error) { next(error); }
});

router.get('/venues', async (req, res, next) => {
  try {
    const filter = { status: 'published' };
    if (req.query.location) filter['location.city'] = new RegExp(escapeRegex(String(req.query.location)), 'i');
    if (req.query.type) filter.type = req.query.type;
    if (req.query.capacity) filter.capacity = { $gte: Number(req.query.capacity) };
    if (req.query.q) filter.$text = { $search: String(req.query.q) };
    const items = await Venue.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (error) { next(error); }
});

router.get('/venues/:id', async (req, res, next) => {
  try {
    const item = await Venue.findOne({ $or: [{ _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }, { slug: req.params.id }], status: 'published' }).lean();
    if (!item) throw notFound('Venue not found');
    res.json({ item });
  } catch (error) { next(error); }
});

router.get('/categories', (_req, res) => res.json({ items: EVENT_CATEGORIES }));
export default router;

