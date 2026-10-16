import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';

const catalog = [
  ['Arijit Singh Live in Concert', 'Entertainment', 'Concert', 'Salem Indoor Stadium', 'Salem', '2026-11-15T19:00:00+05:30', 1499, '/images/concert.png'],
  ['Stand Up Comedy Night', 'Entertainment', 'Stand-up comedy', 'Kalyani Auditorium', 'Chennai', '2026-11-22T19:00:00+05:30', 499, '/images/party.png'],
  ['Tech Innovation Summit 2026', 'Education', 'Conferences', 'Salem Convention Centre', 'Bengaluru', '2026-12-10T09:00:00+05:30', 1499, '/images/business.png'],
  ['Food & Culture Festival', 'Food & Lifestyle', 'Food festivals', 'Salem Fair Grounds', 'Salem', '2027-01-18T11:00:00+05:30', 299, '/images/festival.png'],
  ['State Level Cricket Championship', 'Sports', 'Cricket', 'Salem District Stadium', 'Coimbatore', '2027-02-05T09:00:00+05:30', 299, '/images/sports.png'],
  ['Photography Workshop', 'Education', 'Workshops', 'Creativity Hub, Salem', 'Chennai', '2027-02-28T10:00:00+05:30', 1199, '/images/workshop.png'],
  ['Art & Handicraft Exhibition', 'Business', 'Exhibitions', 'Salem Exhibition Centre', 'Salem', '2027-01-12T10:00:00+05:30', 149, '/images/expo.png'],
  ['EDM Night – DJ Festival', 'Parties', 'DJ nights', 'Urban Arena, Salem', 'Bengaluru', '2027-01-25T19:00:00+05:30', 799, '/images/hero4.png'],
  ['Sunset Music Festival', 'Entertainment', 'Music', 'Salem Open Grounds', 'Coimbatore', '2027-03-14T16:00:00+05:30', 999, '/images/hero1.png'],
  ['Business Networking Meet', 'Business', 'Networking', 'Grand Estancia Hotel', 'Salem', '2027-04-03T16:00:00+05:30', 999, '/images/why-events.png'],
  ['Cultural Dance Festival', 'Cultural', 'Cultural programs', 'Salem Arts Arena', 'Chennai', '2027-04-18T18:00:00+05:30', 399, '/images/hero6.png'],
  ['AI & Technology Workshop', 'Education', 'Workshops', 'Salem Tech Hub', 'Bengaluru', '2027-04-30T10:00:00+05:30', 799, '/images/hero3.png'],
];

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
