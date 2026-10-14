import mongoose from 'mongoose';

const ticketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  priceMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true },
  capacity: { type: Number, required: true, min: 1 },
  reserved: { type: Number, default: 0, min: 0 },
  sold: { type: Number, default: 0, min: 0 },
  minPerOrder: { type: Number, default: 1, min: 1 },
  maxPerOrder: { type: Number, default: 10, min: 1 },
  salesStart: Date,
  salesEnd: Date,
});

const eventSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, required: true, maxlength: 10000 },
  category: { type: String, required: true, index: true },
  subcategory: { type: String, required: true, index: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', index: true },
  venueName: { type: String, trim: true, maxlength: 160, index: true },
  location: { city: { type: String, required: true, index: true }, address: String },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true },
  timezone: { type: String, default: 'Asia/Kolkata' },
  images: [String],
  ticketTypes: { type: [ticketTypeSchema], default: [] },
  status: { type: String, enum: ['draft', 'pending_review', 'approved', 'published', 'rejected', 'cancelled', 'suspended'], default: 'draft', index: true },
  publishedAt: Date,
  approvalFeedback: String,
}, { timestamps: true });

eventSchema.index({ title: 'text', description: 'text', category: 'text', subcategory: 'text', venueName: 'text', 'location.city': 'text' });
eventSchema.index({ status: 1, startsAt: 1 });

export const Event = mongoose.model('Event', eventSchema);

