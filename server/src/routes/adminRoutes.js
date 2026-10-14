import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Application } from '../models/Application.js';
import { AuditLog } from '../models/AuditLog.js';
import { Event } from '../models/Event.js';
import { Venue } from '../models/Venue.js';
import { User, ROLES } from '../models/User.js';
import { notFound, AppError } from '../utils/errors.js';

const router = Router();
router.use(['/admin', '/super-admin'], authenticate, authorize('admin', 'super_admin'));
const review = z.object({ body: z.object({ decision: z.enum(['approved', 'rejected']), feedback: z.string().max(1000).optional() }) });

router.get('/admin/applications', async (req, res, next) => { try { res.json({ items: await Application.find(req.query.status ? { status: req.query.status } : {}).populate('applicant', 'name email').sort({ createdAt: 1 }) }); } catch (e) { next(e); } });
router.post('/admin/applications/:id/review', validate(review), async (req, res, next) => { try { const application = await Application.findOne({ _id: req.params.id, status: 'pending' }); if (!application) throw notFound('Pending application not found'); application.status = req.body.decision; application.feedback = req.body.feedback; application.reviewer = req.user.id; application.reviewedAt = new Date(); await application.save(); if (application.status === 'approved') { const role = application.type === 'organizer' ? 'event_organizer' : 'venue_owner'; await User.updateOne({ _id: application.applicant }, { $addToSet: { roles: role } }); } await AuditLog.create({ actor: req.user.id, action: `application.${application.status}`, resourceType: 'Application', resourceId: application.id }); res.json({ application }); } catch (e) { next(e); } });

for (const [path, Model] of [['events', Event], ['venues', Venue]]) router.post(`/admin/${path}/:id/review`, validate(review), async (req, res, next) => { try { const item = await Model.findOne({ _id: req.params.id, status: 'pending_review' }); if (!item) throw notFound('Pending listing not found'); item.status = req.body.decision === 'approved' ? 'published' : 'rejected'; item.approvalFeedback = req.body.feedback; if (item.status === 'published' && path === 'events') item.publishedAt = new Date(); await item.save(); await AuditLog.create({ actor: req.user.id, action: `${path}.${item.status}`, resourceType: Model.modelName, resourceId: item.id }); res.json({ item }); } catch (e) { next(e); } });

router.get('/admin/users', async (req, res, next) => { try { const filter = req.query.q ? { $or: [{ name: new RegExp(String(req.query.q), 'i') }, { email: new RegExp(String(req.query.q), 'i') }] } : {}; res.json({ items: await User.find(filter).limit(100).sort({ createdAt: -1 }) }); } catch (e) { next(e); } });
router.patch('/admin/users/:id/status', validate(z.object({ body: z.object({ status: z.enum(['active', 'suspended']) }) })), async (req, res, next) => { try { if (String(req.user.id) === req.params.id && req.body.status === 'suspended') throw new AppError(409, 'SELF_SUSPEND', 'You cannot suspend your own account'); const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }); if (!user) throw notFound('User not found'); await AuditLog.create({ actor: req.user.id, action: `user.${req.body.status}`, resourceType: 'User', resourceId: user.id }); res.json({ user }); } catch (e) { next(e); } });
router.patch('/super-admin/users/:id/roles', authorize('super_admin'), validate(z.object({ body: z.object({ roles: z.array(z.enum(ROLES)).min(1) }) })), async (req, res, next) => { try { const user = await User.findByIdAndUpdate(req.params.id, { roles: req.body.roles }, { new: true }); if (!user) throw notFound('User not found'); await AuditLog.create({ actor: req.user.id, action: 'user.roles_updated', resourceType: 'User', resourceId: user.id, metadata: { roles: req.body.roles } }); res.json({ user }); } catch (e) { next(e); } });
router.get('/admin/audit-logs', async (_req, res, next) => { try { res.json({ items: await AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(200) }); } catch (e) { next(e); } });
export default router;

