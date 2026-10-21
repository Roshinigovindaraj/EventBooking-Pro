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
const ticketQuery = z.object({ query: z.object({ credential: z.string().min(32).max(200) }) });
const assertEventAccess = async (user, eventId) => {
  if (user.roles.some(role => ['admin', 'super_admin'].includes(role))) return;
  if (user.roles.includes('event_organizer') && await Event.exists({ _id: eventId, organizer: user.id })) return;
  if (user.roles.includes('event_staff') && await StaffAssignment.exists({ staff: user.id, event: eventId, scopeType: 'event', status: 'active', permissions: 'ticket_check_in' })) return;
  throw new AppError(403, 'NOT_ASSIGNED', 'You are not assigned to check in tickets for this event');
};
router.get('/event-staff/assignments', authorize('event_staff'), async (req, res, next) => { try { res.json({ items: await StaffAssignment.find({ staff: req.user.id, scopeType: 'event', status: 'active' }).populate('event', 'title startsAt endsAt venueName location images').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.get('/tickets/verify', authorize('event_staff', 'event_organizer', 'admin', 'super_admin'), validate(ticketQuery), async (req, res, next) => {
  try {
    const credentialHash = crypto.createHash('sha256').update(req.query.credential).digest('hex');
    const ticket = await Ticket.findOne({ credentialHash }).select('+credentialHash');
    if (!ticket) throw new AppError(404, 'TICKET_INVALID', 'Ticket not found or QR code is invalid');
    await assertEventAccess(req.user, ticket.event);
    const populated = await Ticket.findById(ticket.id).populate('owner', 'name email').populate('booking', 'bookingReference quantity ticketTypeId paymentStatus');
    const event = await Event.findById(ticket.event).select('title venueName location startsAt endsAt ticketTypes');
    const type = event?.ticketTypes.id(populated.booking?.ticketTypeId);
    res.json({ valid: !['cancelled','refunded'].includes(ticket.status), status: ticket.status, checkedInAt: ticket.checkedInAt, ticket: { id:ticket.id, code:ticket.code, ticketType:type?.name || 'General Admission' }, customer: populated.owner, booking: { reference:populated.booking?.bookingReference, quantity:populated.booking?.quantity, paymentStatus:populated.booking?.paymentStatus }, event: { id:event?.id, title:event?.title, venue:event?.venueName, location:event?.location, startsAt:event?.startsAt, endsAt:event?.endsAt } });
  } catch (e) { next(e); }
});
router.post('/tickets/check-in', authorize('event_staff', 'event_organizer', 'admin', 'super_admin'), validate(z.object({ body: z.object({ eventId: z.string().regex(/^[a-f\d]{24}$/i), credential: z.string().min(32).max(200) }) })), async (req, res, next) => {
  try {
    await assertEventAccess(req.user, req.body.eventId);
    const credentialHash = crypto.createHash('sha256').update(req.body.credential).digest('hex');
    const ticket = await Ticket.findOneAndUpdate({ event: req.body.eventId, credentialHash, status: 'issued' }, { status: 'checked_in', checkedInAt: new Date(), checkedInBy: req.user.id }, { new: true }).select('+credentialHash');
    if (!ticket) throw new AppError(409, 'TICKET_REJECTED', 'Ticket is invalid, cancelled, refunded, for another event, or already used');
    await AuditLog.create({ actor: req.user.id, action: 'ticket.checked_in', resourceType: 'Ticket', resourceId: ticket.id });
    res.json({ result: 'accepted', ticket: { id: ticket.id, code: ticket.code, checkedInAt: ticket.checkedInAt } });
  } catch (e) { next(e); }
});

router.get('/venue-staff/tasks', authorize('venue_staff'), async (req, res, next) => { try { res.json({ items: await OperationalTask.find({ assignee: req.user.id }).populate('venue', 'name').populate('reservation').sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.patch('/venue-staff/tasks/:id', authorize('venue_staff'), validate(z.object({ body: z.object({ status: z.enum(['todo', 'in_progress', 'blocked', 'completed']), notes: z.string().max(2000).optional() }) })), async (req, res, next) => { try { const update = { ...req.body, completedAt: req.body.status === 'completed' ? new Date() : null }; const task = await OperationalTask.findOneAndUpdate({ _id: req.params.id, assignee: req.user.id }, update, { new: true }); if (!task) throw new AppError(404, 'TASK_NOT_FOUND', 'Assigned task not found'); await AuditLog.create({ actor: req.user.id, action: `task.${req.body.status}`, resourceType: 'OperationalTask', resourceId: task.id }); res.json({ task }); } catch (e) { next(e); } });
export default router;

