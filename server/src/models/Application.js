import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['organizer', 'venue_owner'], required: true },
  details: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feedback: String,
  reviewedAt: Date,
}, { timestamps: true });
applicationSchema.index({ applicant: 1, type: 1, status: 1 });
export const Application = mongoose.model('Application', applicationSchema);

