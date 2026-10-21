import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const router = Router();
const imageData = z.string().max(4_200_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'A valid JPG, PNG, or WebP image is required');

router.post('/uploads/event-image', authenticate, authorize('event_organizer'), validate(z.object({ body: z.object({ image: imageData }) })), async (req, res, next) => {
  try {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new AppError(503, 'IMAGE_UPLOAD_NOT_CONFIGURED', 'Cloudinary image uploads are not configured');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'eventoria/events';
    const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest('hex');
    const body = new FormData();
    body.set('file', req.body.image);
    body.set('api_key', env.CLOUDINARY_API_KEY);
    body.set('timestamp', String(timestamp));
    body.set('folder', folder);
    body.set('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`, { method: 'POST', body });
    const result = await response.json();
    if (!response.ok || !result.secure_url) throw new AppError(502, 'IMAGE_UPLOAD_FAILED', result.error?.message || 'Cloudinary could not upload the image');
    res.status(201).json({ image: { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, format: result.format } });
  } catch (error) { next(error); }
});

export default router;
