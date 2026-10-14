import mongoose from 'mongoose';

const operationalTaskSchema = new mongoose.Schema({
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'VenueReservation', index: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 180 },
  notes: { type: String, maxlength: 2000 },
  status: { type: String, enum: ['todo', 'in_progress', 'blocked', 'completed'], default: 'todo' },
  completedAt: Date,
}, { timestamps: true });
export const OperationalTask = mongoose.model('OperationalTask', operationalTaskSchema);

