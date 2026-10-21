import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPriceMinor: { type: Number, required: true, min: 0 },
  subtotalMinor: { type: Number, required: true, min: 0 },
  feeMinor: { type: Number, required: true, min: 0 },
  totalMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'expired', 'cancelled', 'refunded'], default: 'pending_payment', index: true },
  paymentStatus: { type: String, enum: ['pending', 'successful', 'failed', 'cancelled', 'refunded'], default: 'pending' },
  refundStatus: { type: String, enum: ['none', 'requested', 'approved', 'rejected', 'processed'], default: 'none', index: true },
  refundReason: { type: String, maxlength: 1000 },
  refundFeedback: { type: String, maxlength: 1000 },
  refundRequestedAt: Date,
  refundedAt: Date,
  reservationExpiresAt: { type: Date, required: true, index: true },
  bookingReference: { type: String, required: true, unique: true },
}, { timestamps: true });

bookingSchema.index({ customer: 1, createdAt: -1 });
export const Booking = mongoose.model('Booking', bookingSchema);

