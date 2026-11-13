const mongoose = require('mongoose');
const hidePassword = require('./plugins/hidePassword');

const MentorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  programs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  }],
  // Added: shown on the mentor's profile.
  bio: { type: String, maxlength: 280 },
  expertise: [{ type: String, maxlength: 32 }],
}, { timestamps: true });

MentorSchema.plugin(hidePassword);

module.exports = mongoose.model('Mentor', MentorSchema);
