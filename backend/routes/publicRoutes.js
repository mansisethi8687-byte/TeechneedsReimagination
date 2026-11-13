const express = require('express');
const mongoose = require('mongoose');
const Program = require('../models/Program');
const Mentor = require('../models/Mentor');
const Mentee = require('../models/Mentee');
const Resource = require('../models/Resource');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date() });
});

// Real counts for the landing page. No fabricated marketing numbers.
router.get('/stats', async (req, res) => {
  const [programs, mentors, mentees, resources, done] = await Promise.all([
    Program.countDocuments(),
    Mentor.countDocuments(),
    Mentee.countDocuments(),
    Resource.countDocuments(),
    Mentee.aggregate([{ $project: { n: { $size: { $ifNull: ['$completedResources', []] } } } }, { $group: { _id: null, n: { $sum: '$n' } } }]),
  ]);
  res.json({ programs, mentors, mentees, resources, completions: done[0]?.n || 0 });
});

module.exports = router;
