import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { Ticket } from '../models/Ticket.js';
import { Booking } from '../models/Booking.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { AppError, notFound } from '../utils/errors.js';

const router = Router();

const hash = value => crypto.createHash('sha256').update(value).digest('hex');

router.get('/tickets/lookup', validate(z.object({ query: z.object({ credential: z.string().min(32).max(200) }) })), async (req, res, next) => {
  try {
    const credentialHash = hash(req.query.credential);
    const ticket = await Ticket.findOne({ credentialHash }).select('+credentialHash');
    
    if (!ticket) {
      throw notFound('Ticket not found or invalid');
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return res.json({
        valid: false,
        status: ticket.status,
        message: `This ticket has been ${ticket.status.replace('_', ' ')}`,
      });
    }

    if (ticket.status === 'checked_in') {
      return res.json({
        valid: true,
        status: 'checked_in',
        message: 'This ticket has already been used',
        checkedInAt: ticket.checkedInAt,
      });
    }

    const booking = await Booking.findById(ticket.booking).populate('customer', 'name email phone');
    const event = await Event.findById(ticket.event).select('title venueName location startsAt endsAt images ticketTypes');
    
    if (!booking || !event) {
      throw notFound('Associated booking or event not found');
    }

    const ticketType = event.ticketTypes?.find(t => t._id.toString() === booking.ticketTypeId.toString());

    res.json({
      valid: true,
      status: 'issued',
      ticket: {
        id: ticket.id,
        code: ticket.code,
        ticketType: ticketType?.name || 'General Admission',
      },
      event: {
        id: event.id,
        title: event.title,
        venue: event.venueName,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        image: event.images?.[0] || null,
      },
      customer: {
        name: booking.customer?.name || 'Unknown',
        email: booking.customer?.email || null,
        phone: booking.customer?.phone || null,
      },
      booking: {
        id: booking.id,
        reference: booking.bookingReference,
        quantity: booking.quantity,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
