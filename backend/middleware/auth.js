const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Mentor = require('../models/Mentor');
const Mentee = require('../models/Mentee');
const { HttpError } = require('./errors');

const MODELS = { admin: Admin, mentor: Mentor, mentee: Mentee };

function readToken(req) {
  const header = req.header('x-auth-token');
  if (header) return header;
  const auth = req.header('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7);
  return null;
}

// authenticate('mentor'), authenticate('admin', 'mentor'), ...
// Sets req.user, req.role and req[role] (so upstream's req.mentor / req.mentee still work).
function authenticate(...roles) {
  return async (req, res, next) => {
    const token = readToken(req);
    if (!token) throw new HttpError(401, 'No token provided');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new HttpError(401, 'Invalid token');
    }

    let role = decoded.role;
    let user = null;
    if (role) {
      if (!roles.includes(role)) throw new HttpError(403, 'Not allowed for your role');
      user = await MODELS[role].findById(decoded.id);
    } else {
      // Upstream tokens carry only { id }. Resolve the role by lookup.
      for (const r of roles) {
        user = await MODELS[r].findById(decoded.id);
        if (user) { role = r; break; }
      }
    }
    if (!user) throw new HttpError(401, 'Account not found');

    req.user = user;
    req.role = role;
    req[role] = user;
    next();
  };
}

module.exports = { authenticate, readToken };
