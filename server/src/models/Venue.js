import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true, maxlength: 10000 },
  type: { type: String, required: true, index: true },
  location: { city: { type: String, required: true, index: true }, address: String },
  timezone: { type: String, default: 'Asia/Kolkata' },
  capacity: { type: Number, required: true, min: 1 },
  amenities: [String],
  images: [String],
  priceMinorPerHour: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  manualApproval: { type: Boolean, default: false },
  operatingHours: { type: String, default: '08:00 AM – 11:00 PM' },
  availableDays: { type: String, default: 'All Days (Mon - Sun)' },
  minBookingHours: { type: Number, default: 4 },
  status: { type: String, enum: ['draft', 'pending_review', 'approved', 'published', 'rejected', 'suspended'], default: 'draft', index: true },
  approvalFeedback: String,
}, { timestamps: true });

venueSchema.index({ name: 'text', description: 'text', type: 'text', 'location.city': 'text' });
export const Venue = mongoose.model('Venue', venueSchema);
