import mongoose from 'mongoose';

const venueReservationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true, index: true },
  purpose: { type: String, required: true, maxlength: 300 },
  customerNotes: { type: String, maxlength: 1000, default: '' },
  totalMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending_payment', 'pending_approval', 'confirmed', 'rejected', 'cancelled', 'expired'],
    default: 'pending_approval',
    index: true
  },
  paymentStatus: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'pending' },
  ownerNotes: { type: String, maxlength: 1000, default: '' },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reservationExpiresAt: { type: Date, required: true },
  reference: { type: String, required: true, unique: true },
}, { timestamps: true });

venueReservationSchema.index({ venue: 1, startsAt: 1, endsAt: 1, status: 1 });
export const VenueReservation = mongoose.model('VenueReservation', venueReservationSchema);


