import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Application } from '../models/Application.js';
import { AppError } from '../utils/errors.js';

const router = Router();
router.use(['/organizer', '/venue-owner'], authenticate);
const schema = z.object({ body: z.object({ details: z.record(z.unknown()).refine(v => Object.keys(v).length > 0, 'Application details are required') }) });
for (const [path, type] of [['organizer', 'organizer'], ['venue-owner', 'venue_owner']]) {
  router.post(`/${path}/applications`, validate(schema), async (req, res, next) => {
    try {
      if (await Application.exists({ applicant: req.user.id, type, status: 'pending' })) throw new AppError(409, 'APPLICATION_PENDING', 'An application is already pending');
      res.status(201).json({ application: await Application.create({ applicant: req.user.id, type, details: req.body.details }) });
    } catch (e) { next(e); }
  });
  router.get(`/${path}/applications/me`, async (req, res, next) => { try { res.json({ items: await Application.find({ applicant: req.user.id, type }).sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
}
export default router;

