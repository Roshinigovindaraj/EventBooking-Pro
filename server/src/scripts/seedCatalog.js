import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Event } from '../models/Event.js';
import { User } from '../models/User.js';
import { Venue } from '../models/Venue.js';

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

// Add your real event objects here if you wish to seed them via script
const catalog = [];


const slugify = (title) => title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

try {
  await connectDatabase();
  let organizer = await User.findOne({ email: 'organizer@eventoria.local' });
  if (!organizer) {
    organizer = await User.create({
      name: 'Eventoria Organizer',
      email: 'organizer@eventoria.local',
      passwordHash: await bcrypt.hash('Organizer@12345', 12),
      roles: ['event_organizer'],
      status: 'active',
      emailVerifiedAt: new Date(),
    });
  }

  // Look up any matching published venue to associate
  const venues = await Venue.find({ status: 'published' });
  const venueMap = new Map(venues.map(v => [v.name.toLowerCase(), v]));

  for (const item of catalog) {
    const start = new Date(now + item.daysAhead * day);
    const end = new Date(start.getTime() + item.durationHours * 60 * 60 * 1000);
    const slug = slugify(item.title);
    const matchedVenue = venueMap.get(item.venueName.toLowerCase());

    await Event.findOneAndUpdate(
      { slug },
      {
        $set: {
          organizer: organizer.id,
          title: item.title,
          slug,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          venue: matchedVenue ? matchedVenue._id : undefined,
          venueName: item.venueName,
          location: { city: item.city, address: item.address },
          startsAt: start,
          endsAt: end,
          timezone: 'Asia/Kolkata',
          images: [item.image],
          benefits: item.benefits,
          ticketTypes: [
            {
              name: 'General Admission',
              priceMinor: item.price * 100,
              currency: 'INR',
              capacity: 500,
              minPerOrder: 1,
              maxPerOrder: 10,
              sold: 0,
              reserved: 0,
            },
            {
              name: 'Premium',
              priceMinor: (item.price + 500) * 100,
              currency: 'INR',
              capacity: 150,
              minPerOrder: 1,
              maxPerOrder: 10,
              sold: 0,
              reserved: 0,
            },
            {
              name: 'VIP Experience',
              priceMinor: (item.price + 1000) * 100,
              currency: 'INR',
              capacity: 50,
              minPerOrder: 1,
              maxPerOrder: 6,
              sold: 0,
              reserved: 0,
            },
          ],
          status: 'published',
          publishedAt: new Date(),
          approvalFeedback: 'Verified and approved for publication',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`Successfully seeded ${catalog.length} published events.`);
} catch (error) {
  console.error('Error seeding catalog events:', error);
} finally {
  await disconnectDatabase();
}
