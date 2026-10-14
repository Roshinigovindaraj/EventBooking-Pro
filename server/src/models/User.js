import mongoose from 'mongoose';

export const ROLES = ['customer', 'event_organizer', 'venue_owner', 'event_staff', 'venue_staff', 'admin', 'super_admin'];

const refreshSessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  roles: { type: [{ type: String, enum: ROLES }], default: ['customer'] },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  emailVerifiedAt: Date,
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  refreshSessions: { type: [refreshSessionSchema], select: false, default: [] },
}, { timestamps: true });

userSchema.set('toJSON', {
  transform(_doc, value) {
    delete value.passwordHash;
    delete value.refreshSessions;
    delete value.passwordResetTokenHash;
    delete value.passwordResetExpiresAt;
    delete value.__v;
    return value;
  },
});

export const User = mongoose.model('User', userSchema);

