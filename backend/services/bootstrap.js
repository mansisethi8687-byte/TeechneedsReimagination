const Admin = require('../models/Admin');
const { hashPassword } = require('./credentials');

// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if it doesn't exist.
// Never overwrites an existing admin's password.
async function ensureAdmin({ email, password, name } = {}) {
  if (!email || !password) return null;
  const existing = await Admin.findOne({ email: email.toLowerCase() });
  if (existing) return existing;
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  const admin = await Admin.create({ name: name || 'TechNeeds Admin', email, password: await hashPassword(password) });
  console.log(`Admin account created for ${admin.email}`);
  return admin;
}

module.exports = { ensureAdmin };
