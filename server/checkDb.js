import { connectDatabase, disconnectDatabase } from './src/config/database.js';
import { Event } from './src/models/Event.js';
import { Venue } from './src/models/Venue.js';
import { User } from './src/models/User.js';

try {
  await connectDatabase();
  const users = await User.find({}, 'name email roles').lean();
  console.log('USERS:', JSON.stringify(users, null, 2));

  const events = await Event.find({}, 'title slug category subcategory organizer status createdAt').lean();
  console.log('EVENTS:', JSON.stringify(events, null, 2));

  const venues = await Venue.find({}, 'name type owner status createdAt').lean();
  console.log('VENUES:', JSON.stringify(venues, null, 2));
} catch (err) {
  console.error(err);
}