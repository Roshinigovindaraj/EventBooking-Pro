import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Event } from '../models/Event.js';
import { StaffAssignment } from '../models/StaffAssignment.js';

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
  console.log(`Role test accounts ready: ${accounts.length}`);
} finally {
  await disconnectDatabase();
}
