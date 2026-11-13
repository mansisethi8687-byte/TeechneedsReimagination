// New: the admin panel had no authentication upstream.
const express = require('express');
const Admin = require('../models/Admin');
const Mentor = require('../models/Mentor');
const Mentee = require('../models/Mentee');
const Program = require('../models/Program');
const Resource = require('../models/Resource');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { HttpError, notFound } = require('../middleware/errors');
const { verifyPassword, signToken, generatePassword, hashPassword } = require('../services/credentials');
const v = require('../services/validate');

const router = express.Router();
const adminOnly = authenticate('admin');

router.post('/login', rateLimit({ scope: 'admin' }), async (req, res) => {
  const { email, password } = req.body || {};
  const admin = email ? await Admin.findOne({ email: String(email).toLowerCase().trim() }) : null;
  const check = admin ? await verifyPassword(password, admin.password) : { ok: false };
  if (!check.ok) throw new HttpError(400, 'Invalid credentials');
  res.json({ token: signToken(admin, 'admin'), role: 'admin', admin });
});

router.get('/me', adminOnly, (req, res) => res.json(req.admin));

router.get('/overview', adminOnly, async (req, res) => {
  const [programs, mentors, mentees, resources, pending] = await Promise.all([
    Program.countDocuments(),
    Mentor.countDocuments(),
    Mentee.countDocuments(),
    Resource.countDocuments(),
    Mentee.aggregate([
      { $unwind: '$completedResources' },
      { $match: { 'completedResources.verified': false, 'completedResources.githubLink': { $exists: true } } },
      { $count: 'n' },
    ]),
  ]);
  res.json({ programs, mentors, mentees, resources, pendingReviews: pending[0]?.n || 0 });
});

// Programs with mentor list and per-program counts, for the admin console.
router.get('/programs', adminOnly, async (req, res) => {
  const programs = await Program.find().sort({ createdAt: -1 }).populate('mentors', 'name email').lean();
  const counts = await Mentee.aggregate([{ $unwind: '$programs' }, { $group: { _id: '$programs', n: { $sum: 1 } } }]);
  const byId = new Map(counts.map((c) => [c._id.toString(), c.n]));
  res.json(programs.map((p) => ({
    ...p,
    menteeCount: byId.get(p._id.toString()) || 0,
    resourceCount: (p.resources || []).length,
  })));
});

router.patch('/programs/:id', adminOnly, async (req, res) => {
  const b = req.body || {};
  const update = v.defined({
    name: v.text(b.name, 'name', { max: 80 }),
    code: v.text(b.code, 'code', { max: 6 })?.toUpperCase(),
    description: v.text(b.description, 'description', { max: 500 }),
    startDate: v.date(b.startDate, 'startDate'),
    endDate: v.date(b.endDate, 'endDate'),
  });
  if (update.code && !/^[A-Z0-9]{2,6}$/.test(update.code)) throw new HttpError(400, 'code must be 2-6 letters or digits');
  const program = await Program.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!program) throw notFound('Program');
  res.json(program);
});

router.post('/programs/:id/remove-mentor', adminOnly, async (req, res) => {
  const { mentorId } = req.body || {};
  const [program, mentor] = await Promise.all([Program.findById(req.params.id), Mentor.findById(mentorId)]);
  if (!program || !mentor) throw notFound('Program/Mentor');
  await Promise.all([
    Program.updateOne({ _id: program._id }, { $pull: { mentors: mentor._id } }),
    Mentor.updateOne({ _id: mentor._id }, { $pull: { programs: program._id } }),
  ]);
  res.json({ message: 'Mentor removed from program' });
});

// Issues a fresh generated password. It is returned once and never stored in plaintext.
router.post('/mentors/:id/reset-password', adminOnly, async (req, res) => {
  const mentor = await Mentor.findById(req.params.id);
  if (!mentor) throw notFound('Mentor');
  const tempPassword = generatePassword();
  mentor.password = await hashPassword(tempPassword);
  await mentor.save();
  res.json({ mentor, tempPassword });
});

module.exports = router;
