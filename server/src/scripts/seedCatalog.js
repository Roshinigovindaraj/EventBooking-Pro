import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';

// Only real events created by approved organizers are stored and served.
const catalog = [];

const slugify = (title) => title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

try {
  await connectDatabase();
  let organizer = await User.findOne({ email: 'catalog@eventoria.local' });
  if (!organizer) organizer = await User.create({
    name: 'Eventoria Catalog',
    email: 'catalog@eventoria.local',
    passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
    roles: ['event_organizer'],
    status: 'active',
  });

  for (const [title, category, subcategory, venueName, city, startsAt, price, image] of catalog) {
    const start = new Date(startsAt);
    await Event.findOneAndUpdate({ slug: slugify(title) }, {
      $setOnInsert: {
        organizer: organizer.id, title, slug: slugify(title),
        description: `${title} is a verified Eventoria experience with secure ticketing and complete event information.`,
        category, subcategory, venueName, location: { city }, startsAt: start,
        endsAt: new Date(start.getTime() + 4 * 60 * 60_000), timezone: 'Asia/Kolkata', images: [image],
        ticketTypes: [
          { name: 'General Admission', priceMinor: price * 100, currency: 'INR', capacity: 500, maxPerOrder: 10 },
          { name: 'Premium', priceMinor: (price + 500) * 100, currency: 'INR', capacity: 150, maxPerOrder: 10 },
          { name: 'VIP', priceMinor: (price + 1000) * 100, currency: 'INR', capacity: 50, maxPerOrder: 10 },
        ],
        status: 'published', publishedAt: new Date(),
      },
    }, { upsert: true, new: true });
  }
  console.log(`Catalog ready: ${catalog.length} published events.`);
} finally {
  await disconnectDatabase();
}
