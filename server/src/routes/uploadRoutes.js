import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const router = Router();
const mediaData = z.string().max(35_000_000).regex(/^data:(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime));base64,[A-Za-z0-9+/=]+$/, 'A valid image (JPG, PNG, WebP) or video (MP4, WebM) is required');

router.post('/uploads/media', authenticate, validate(z.object({ body: z.object({ file: mediaData, folder: z.string().max(80).optional() }) })), async (req, res, next) => {
  try {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new AppError(503, 'IMAGE_UPLOAD_NOT_CONFIGURED', 'Cloudinary uploads are not configured in environment variables');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const targetFolder = req.body.folder || 'eventoria/venues';
    const signature = crypto.createHash('sha1').update(`folder=${targetFolder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest('hex');
    const body = new FormData();
    body.set('file', req.body.file);
    body.set('api_key', env.CLOUDINARY_API_KEY);
    body.set('timestamp', String(timestamp));
    body.set('folder', targetFolder);
    body.set('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/auto/upload`, { method: 'POST', body });
    const result = await response.json();
    if (!response.ok || !result.secure_url) throw new AppError(502, 'UPLOAD_FAILED', result.error?.message || 'Cloudinary upload failed');
    res.status(201).json({
      media: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        format: result.format,
        width: result.width,
        height: result.height,
        duration: result.duration
      }
    });
  } catch (error) { next(error); }
});

router.post('/uploads/event-image', authenticate, validate(z.object({ body: z.object({ image: z.string().max(35_000_000) }) })), async (req, res, next) => {
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
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/auto/upload`, { method: 'POST', body });
    const result = await response.json();
    if (!response.ok || !result.secure_url) throw new AppError(502, 'IMAGE_UPLOAD_FAILED', result.error?.message || 'Cloudinary could not upload the image');
    res.status(201).json({ image: { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, format: result.format } });
  } catch (error) { next(error); }
});

export default router;
