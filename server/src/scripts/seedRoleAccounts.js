import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { StaffAssignment } from '../models/StaffAssignment.js';
import { Venue } from '../models/Venue.js';
import { VenueReservation } from '../models/VenueReservation.js';
import { OperationalTask } from '../models/OperationalTask.js';

const accounts = [
  ['Customer Demo', 'customer@eventoria.local', ['customer']],
  ['Organizer Demo', 'organizer@eventoria.local', ['event_organizer']],
  ['Venue Owner Demo', 'venueowner@eventoria.local', ['venue_owner']],
  ['Event Staff Demo', 'eventstaff@eventoria.local', ['event_staff']],
  ['Venue Staff Demo', 'venuestaff@eventoria.local', ['venue_staff']],
  ['Admin Demo', 'admin@eventoria.local', ['admin']],
  ['Super Admin Demo', 'superadmin@eventoria.local', ['super_admin']],
];

try {
  await connectDatabase();
  for (const [name, email, roles] of accounts) {
    if (await User.exists({ email })) { console.log(`${email}: already exists (password unchanged)`); continue; }
    const temporaryPassword = `Ev!${crypto.randomBytes(9).toString('base64url')}`;
    await User.create({ name, email, passwordHash: await bcrypt.hash(temporaryPassword, 12), roles, status: 'active', emailVerifiedAt: new Date() });
    console.log(`${email}: ${temporaryPassword}`);
  }
  const [eventStaff, organizer, publishedEvents] = await Promise.all([
    User.findOne({ email: 'eventstaff@eventoria.local' }),
    User.findOne({ email: 'organizer@eventoria.local' }),
    Event.find({ status: 'published', startsAt: { $gte: new Date() } }).sort({ startsAt: 1 }).limit(3),
  ]);
  if (eventStaff && organizer && publishedEvents.length) {
    for (const event of publishedEvents) {
      await StaffAssignment.findOneAndUpdate(
        { staff: eventStaff.id, scopeType: 'event', event: event.id },
        { $set: { assignedBy: organizer.id, permissions: ['event_preparation', 'ticket_check_in', 'attendance_view', 'event_completion'], status: 'active' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
    console.log(`eventstaff@eventoria.local: assigned to ${publishedEvents.length} published events`);
  } else {
    console.log('eventstaff@eventoria.local: no future published events available for assignment');
  }

  const [venueStaff, sampleVenue, sampleReservation] = await Promise.all([
    User.findOne({ email: 'venuestaff@eventoria.local' }),
    Venue.findOne({ status: 'published' }),
    VenueReservation.findOne({ status: 'confirmed' }),
  ]);
  if (venueStaff && sampleVenue) {
    const tasks = [
      { title: 'Pre-event Floor & Seating Arrangement', notes: 'Arrange banquet seating for 350 guests and clear central aisle.', status: 'in_progress' },
      { title: 'Stage Lighting & Audio System Check', notes: 'Verify wireless microphones, podium spotlights, and backup generator power.', status: 'todo' },
      { title: 'Catering & Service Access Verification', notes: 'Check kitchen entry, vendor loading dock, and waste disposal units.', status: 'todo' },
      { title: 'Air Conditioning & Power Generator Inspection', notes: 'Pre-cool main hall to 22°C and check diesel generator fuel levels.', status: 'completed' },
      { title: 'Gate Entry & Guest Parking Protocol', notes: 'Coordinate valet parking and display directional signs at main gate.', status: 'todo' },
    ];
    for (const t of tasks) {
      await OperationalTask.findOneAndUpdate(
        { assignee: venueStaff.id, title: t.title },
        { $set: { venue: sampleVenue.id, reservation: sampleReservation?.id || null, notes: t.notes, status: t.status, completedAt: t.status === 'completed' ? new Date() : null } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`venuestaff@eventoria.local: assigned to ${tasks.length} operational tasks`);
  }
  console.log(`Role test accounts ready: ${accounts.length}`);
} finally {
  await disconnectDatabase();
}
