// In-memory limiter for login endpoints. One process is enough for this
// deployment; swap for a shared store if the API is ever scaled out.
//
// Only FAILED attempts count. A whole lab signing in from one campus IP must
// not lock itself out, so successes are free and limits are per account:
//   - perAccount failures per (ip, identifier) per window
//   - perIp failures per ip per window (stops spraying many accounts)
function rateLimit({
  windowMs = 15 * 60 * 1000,
  perAccount = 8,
  perIp = 60,
  identifier = (req) => String(req.body?.email || req.body?.enrollmentNumber || '').trim().toLowerCase(),
  scope = 'login',
} = {}) {
  const hits = new Map();

  const count = (key, now) => {
    const e = hits.get(key);
    return e && now < e.reset ? e.count : 0;
  };
  const bump = (key, now) => {
    const e = hits.get(key);
    if (!e || now >= e.reset) hits.set(key, { count: 1, reset: now + windowMs });
    else e.count += 1;
  };

  // Drop expired entries now and then so the map can't grow without bound.
  let sweeps = 0;
  const sweep = (now) => {
    if (++sweeps % 500) return;
    for (const [k, e] of hits) if (now >= e.reset) hits.delete(k);
  };

  return (req, res, next) => {
    if (process.env.DISABLE_RATE_LIMIT === '1') return next();
    const now = Date.now();
    sweep(now);
    const ipKey = `${scope}:ip:${req.ip}`;
    const acctKey = `${scope}:acct:${req.ip}:${identifier(req)}`;

    if (count(acctKey, now) >= perAccount || count(ipKey, now) >= perIp) {
      const e = hits.get(count(acctKey, now) >= perAccount ? acctKey : ipKey);
      res.set('Retry-After', String(Math.ceil((e.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many failed attempts. Try again in a few minutes.' });
    }

    res.on('finish', () => {
      if (res.statusCode === 400 || res.statusCode === 401) {
        bump(acctKey, Date.now());
        bump(ipKey, Date.now());
      }
    });
    next();
  };
}

module.exports = { rateLimit };
