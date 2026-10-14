import mongoose from 'mongoose';

const venueReservationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true, index: true },
  purpose: { type: String, required: true, maxlength: 300 },
  totalMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  status: { type: String, enum: ['pending_payment', 'pending_approval', 'confirmed', 'rejected', 'cancelled', 'expired'], default: 'pending_payment', index: true },
  paymentStatus: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'pending' },
  reservationExpiresAt: { type: Date, required: true },
  reference: { type: String, required: true, unique: true },
}, { timestamps: true });

venueReservationSchema.index({ venue: 1, startsAt: 1, endsAt: 1, status: 1 });
export const VenueReservation = mongoose.model('VenueReservation', venueReservationSchema);

