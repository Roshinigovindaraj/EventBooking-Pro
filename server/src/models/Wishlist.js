import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemType: { type: String, enum: ['event', 'venue'], required: true },
  item: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'itemModel' },
  itemModel: { type: String, enum: ['Event', 'Venue'], required: true },
}, { timestamps: true });
wishlistSchema.index({ user: 1, itemType: 1, item: 1 }, { unique: true });
export const Wishlist = mongoose.model('Wishlist', wishlistSchema);

