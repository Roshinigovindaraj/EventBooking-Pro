import mongoose from 'mongoose';

const staffAssignmentSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scopeType: { type: String, enum: ['event', 'venue'], required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
  permissions: [String],
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
}, { timestamps: true });
staffAssignmentSchema.index({ staff: 1, scopeType: 1, event: 1, venue: 1, status: 1 });
export const StaffAssignment = mongoose.model('StaffAssignment', staffAssignmentSchema);

