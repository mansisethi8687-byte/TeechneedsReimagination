const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Counter = require('../models/Counter');
const Mentee = require('../models/Mentee');

// No 0/O, 1/l/I: these get read aloud and typed from a credential card.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generatePassword(length = 12) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

const hashPassword = (plain) => bcrypt.hash(plain, 10);
const isBcryptHash = (s) => typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s);

// Returns { ok, legacy }. `legacy` means the stored value was plaintext
// (upstream stored mentee passwords that way) and should be re-hashed now.
async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return { ok: false };
  if (isBcryptHash(stored)) return { ok: await bcrypt.compare(plain, stored), legacy: false };
  const a = Buffer.from(plain);
  const b = Buffer.from(stored);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, legacy: ok };
}

function signToken(user, role) {
  return jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// "Web Development" -> "WD", "Machine Learning Cohort" -> "MLC", "Java" -> "JAVA"
function deriveProgramCode(name = '') {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
    .filter((w) => !/^\d+$/.test(w));
  if (words.length === 0) return 'TN';
  if (words.length === 1) return words[0].slice(0, 4);
  return words.map((w) => w[0]).join('').slice(0, 4);
}

// TN-<CODE><YY>-<NNN>, sequential per program, e.g. TN-WD26-001.
async function nextEnrollmentNumber(program) {
  const code = program.code || deriveProgramCode(program.name);
  const yy = String((program.createdAt || new Date()).getFullYear()).slice(-2);
  for (let attempt = 0; attempt < 20; attempt++) {
    const { seq } = await Counter.findOneAndUpdate(
      { _id: `enrollment:${program._id}` },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    const candidate = `TN-${code}${yy}-${String(seq).padStart(3, '0')}`;
    // Skips numbers a mentor already typed by hand under the old flow.
    if (!(await Mentee.exists({ enrollmentNumber: candidate }))) return candidate;
  }
  throw new Error('Could not allocate an enrollment number');
}

module.exports = {
  generatePassword, hashPassword, verifyPassword, isBcryptHash, signToken,
  deriveProgramCode, nextEnrollmentNumber,
};
