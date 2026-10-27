import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { StaffAssignment } from '../models/StaffAssignment.js';
import { Ticket } from '../models/Ticket.js';
import { OperationalTask } from '../models/OperationalTask.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../utils/errors.js';
import { Event } from '../models/Event.js';

const router = Router();
router.use(['/tickets', '/event-staff', '/venue-staff'], authenticate);
import { resolveTicket } from '../utils/ticketResolver.js';

const ticketQuery = z.object({ query: z.object({ credential: z.string().trim().min(1).max(500) }) });
const assertEventAccess = async (user, eventId) => {
  if (user.roles.some(role => ['admin', 'super_admin'].includes(role))) return;
  if (user.roles.includes('event_organizer') && await Event.exists({ _id: eventId, organizer: user.id })) return;
  if (user.roles.includes('event_staff') && await StaffAssignment.exists({ staff: user.id, event: eventId, scopeType: 'event', status: 'active', permissions: 'ticket_check_in' })) return;
  throw new AppError(403, 'NOT_ASSIGNED', 'You are not assigned to check in tickets for this event');
};
router.get('/event-staff/assignments', authorize('event_staff'), async (req, res, next) => { try { res.json({ items: await StaffAssignment.find({ staff: req.user.id, scopeType: 'event', status: 'active' }).populate('event', 'title startsAt endsAt venueName location images').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });

router.get('/tickets/verify', authorize('event_staff', 'event_organizer', 'admin', 'super_admin'), validate(ticketQuery), async (req, res, next) => {
  try {
    const resolved = await resolveTicket(req.query.credential);
    if (!resolved?.ticket) throw new AppError(404, 'TICKET_INVALID', 'Ticket not found. Check the booking ID (e.g. EVT-...) or ticket code.');
    const { ticket, allBookingTickets } = resolved;
    await assertEventAccess(req.user, ticket.event);
    const populated = await Ticket.findById(ticket.id).populate('owner', 'name email phone').populate('booking', 'bookingReference quantity ticketTypeId paymentStatus');
    const event = await Event.findById(ticket.event).select('title venueName location startsAt endsAt ticketTypes');
    const type = event?.ticketTypes.id(populated.booking?.ticketTypeId);
    const typeName = type?.name || 'General Admission';

    const formattedAllTickets = (allBookingTickets || []).map((t, idx) => ({
      id: t.id,
      code: t.code,
      status: t.status,
      checkedInAt: t.checkedInAt,
      attendeeNumber: idx + 1,
      ticketType: typeName,
      isCurrent: String(t.id) === String(ticket.id),
    }));

    res.json({
      valid: !['cancelled', 'refunded'].includes(ticket.status),
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      ticket: { id: ticket.id, code: ticket.code, ticketType: typeName, status: ticket.status, checkedInAt: ticket.checkedInAt },
      allTickets: formattedAllTickets,
      customer: populated.owner,
      booking: { reference: populated.booking?.bookingReference, quantity: populated.booking?.quantity, paymentStatus: populated.booking?.paymentStatus },
      event: { id: event?.id, title: event?.title, venue: event?.venueName, location: event?.location, startsAt: event?.startsAt, endsAt: event?.endsAt },
    });
  } catch (e) { next(e); }
});

router.post('/tickets/check-in', authorize('event_staff', 'event_organizer', 'admin', 'super_admin'), validate(z.object({
  body: z.object({
    eventId: z.string().regex(/^[a-f\d]{24}$/i),
    credential: z.string().trim().min(1).max(500).optional(),
    ticketId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    checkInAll: z.boolean().optional(),
  }).refine(data => data.credential || data.ticketId, {
    message: 'Either ticketId or credential must be provided',
  }),
})), async (req, res, next) => {
  try {
    await assertEventAccess(req.user, req.body.eventId);
    let ticket = null;
    let allBookingTickets = [];

    if (req.body.ticketId) {
      ticket = await Ticket.findById(req.body.ticketId).select('+credentialHash');
      if (ticket) {
        allBookingTickets = await Ticket.find({ booking: ticket.booking }).sort({ createdAt: 1 });
      }
    } else if (req.body.credential) {
      const resolved = await resolveTicket(req.body.credential);
      ticket = resolved?.ticket;
      allBookingTickets = resolved?.allBookingTickets || [];
    }

    if (!ticket) throw new AppError(404, 'TICKET_INVALID', 'Ticket not found or credential invalid');
    if (String(ticket.event) !== String(req.body.eventId)) {
      throw new AppError(400, 'EVENT_MISMATCH', 'This ticket belongs to a different event');
    }

    if (ticket.status === 'checked_in') {
      throw new AppError(409, 'TICKET_ALREADY_USED', `Ticket ${ticket.code} has already been checked in`);
    }
    if (['cancelled', 'refunded'].includes(ticket.status)) {
      throw new AppError(409, 'TICKET_INVALID_STATUS', `Ticket ${ticket.code} is ${ticket.status}`);
    }

    const now = new Date();
    if (req.body.checkInAll && allBookingTickets.length > 0) {
      const issuedIds = allBookingTickets.filter(t => t.status === 'issued').map(t => t._id);
      if (issuedIds.length > 0) {
        await Ticket.updateMany(
          { _id: { $in: issuedIds } },
          { status: 'checked_in', checkedInAt: now, checkedInBy: req.user.id }
        );
        for (const tid of issuedIds) {
          await AuditLog.create({ actor: req.user.id, action: 'ticket.checked_in', resourceType: 'Ticket', resourceId: tid });
        }
      }
      ticket.status = 'checked_in';
      ticket.checkedInAt = now;
      ticket.checkedInBy = req.user.id;
    } else {
      ticket.status = 'checked_in';
      ticket.checkedInAt = now;
      ticket.checkedInBy = req.user.id;
      await ticket.save();
      await AuditLog.create({ actor: req.user.id, action: 'ticket.checked_in', resourceType: 'Ticket', resourceId: ticket.id });
    }

    const updatedTickets = await Ticket.find({ booking: ticket.booking }).sort({ createdAt: 1 });
    res.json({
      result: 'accepted',
      ticket: { id: ticket.id, code: ticket.code, status: ticket.status, checkedInAt: ticket.checkedInAt },
      allTickets: updatedTickets.map((t, idx) => ({ id: t.id, code: t.code, status: t.status, checkedInAt: t.checkedInAt, attendeeNumber: idx + 1 })),
    });
  } catch (e) { next(e); }
});

router.get('/venue-staff/tasks', authorize('venue_staff'), async (req, res, next) => { try { res.json({ items: await OperationalTask.find({ assignee: req.user.id }).populate('venue', 'name').populate('reservation').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.patch('/venue-staff/tasks/:id', authorize('venue_staff'), validate(z.object({ body: z.object({ status: z.enum(['todo', 'in_progress', 'blocked', 'completed']), notes: z.string().max(2000).optional() }) })), async (req, res, next) => { try { const update = { ...req.body, completedAt: req.body.status === 'completed' ? new Date() : null }; const task = await OperationalTask.findOneAndUpdate({ _id: req.params.id, assignee: req.user.id }, update, { new: true }); if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Assigned task not found'); await AuditLog.create({ actor: req.user.id, action: `task.${req.body.status}`, resourceType: 'OperationalTask', resourceId: task.id }); res.json({ task }); } catch (e) { next(e); } });
export default router;

