import mongoose from 'mongoose';

const checkInRecordSchema = new mongoose.Schema({
  attendeeIndex: { type: Number, required: true },
  checkedInAt: { type: Date, default: Date.now },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  count: { type: Number, default: 1 },
  notes: String,
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  credentialHash: { type: String, required: true, unique: true, select: false },
  code: { type: String, required: true, unique: true },
  admitCount: { type: Number, default: 1, min: 1 },
  checkedInCount: { type: Number, default: 0, min: 0 },
  checkIns: { type: [checkInRecordSchema], default: [] },
  status: { type: String, enum: ['issued', 'partially_checked_in', 'checked_in', 'cancelled', 'refunded'], default: 'issued', index: true },
  checkedInAt: Date,
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const Ticket = mongoose.model('Ticket', ticketSchema);

