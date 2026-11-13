const { HttpError } = require('../middleware/errors');

function text(value, field, { required = false, max = 200 } = {}) {
  if (value == null || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  const v = value.trim();
  if (required && !v) throw new HttpError(400, `${field} is required`);
  if (v.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return v;
}

function email(value, field = 'email') {
  const v = text(value, field, { required: true, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new HttpError(400, `${field} is not a valid email`);
  return v;
}

function url(value, field, { required = false } = {}) {
  const v = text(value, field, { required, max: 2048 });
  if (v === undefined) return undefined;
  let parsed;
  try { parsed = new URL(v); } catch { throw new HttpError(400, `${field} must be a valid URL`); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, `${field} must start with http(s)://`);
  return v;
}

function number(value, field, { min = -Infinity, max = Infinity, required = false } = {}) {
  if (value == null || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${field} must be a number`);
  if (n < min || n > max) throw new HttpError(400, `${field} must be between ${min} and ${max}`);
  return n;
}

function date(value, field, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return undefined;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${field} must be a date`);
  return d;
}

function tags(value, field = 'tags', { max = 12 } = {}) {
  if (value == null) return undefined;
  const arr = Array.isArray(value) ? value : String(value).split(',');
  const clean = [...new Set(arr.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  if (clean.length > max) throw new HttpError(400, `At most ${max} ${field}`);
  if (clean.some((t) => t.length > 32)) throw new HttpError(400, `Each of ${field} must be at most 32 characters`);
  return clean;
}

// Pick only defined values, so PATCH bodies don't null out fields.
const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

module.exports = { text, email, url, number, date, tags, defined };
