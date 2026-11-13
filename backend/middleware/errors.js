// Express 5 forwards rejected promises from handlers to the error middleware,
// so routes can simply `throw new HttpError(...)`.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}

const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);

function notFoundRoute(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err.name === 'CastError') {
    return res.status(404).json({ error: `Invalid ${err.path || 'id'}` });
  }
  if (err.name === 'ValidationError') {
    const details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ error: 'Validation failed', details });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `That ${field} is already in use` });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({ error: 'Server error' });
}

module.exports = { HttpError, notFound, notFoundRoute, errorHandler };
