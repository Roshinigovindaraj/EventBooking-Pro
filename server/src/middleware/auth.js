import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { verifyAccessToken } from '../services/authService.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') throw new AppError(401, 'AUTH_REQUIRED', 'Authentication is required');
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.some(role => req.user.roles.includes(role))) return next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));
  next();
};

