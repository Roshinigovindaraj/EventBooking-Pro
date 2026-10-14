import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  credentialHash: { type: String, required: true, unique: true, select: false },
  code: { type: String, required: true, unique: true },
  status: { type: String, enum: ['issued', 'checked_in', 'cancelled', 'refunded'], default: 'issued', index: true },
  checkedInAt: Date,
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const Ticket = mongoose.model('Ticket', ticketSchema);

