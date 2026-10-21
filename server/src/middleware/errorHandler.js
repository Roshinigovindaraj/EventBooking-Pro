import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  if (error?.name === 'ZodError') {
    const issues = error.issues.map(issue => ({ field: issue.path.filter(part => part !== 'body').join('.') || 'request', message: issue.message }));
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: issues.map(issue => `${issue.field}: ${issue.message}`).join(' · '), details: { issues } } });
  }
  if (error?.name === 'ValidationError') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ error: { code: 'DUPLICATE_RESOURCE', message: 'A record with that value already exists' } });
  }
  const status = error instanceof AppError ? error.status : 500;
  const body = { error: { code: error.code || 'INTERNAL_ERROR', message: status === 500 ? 'An unexpected error occurred' : error.message } };
  if (error.details) body.error.details = error.details;
  if (process.env.NODE_ENV !== 'test' && status === 500) console.error(error);
  res.status(status).json(body);
}

