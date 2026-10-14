import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true },
  resourceId: mongoose.Schema.Types.ObjectId,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

