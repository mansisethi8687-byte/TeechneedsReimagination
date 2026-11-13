const mongoose = require('mongoose');

const ProgramSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mentors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mentor'
  }],
  resources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  // Added: short code used in enrollment numbers (TN-WEB26-001), plus configuration.
  code: { type: String, uppercase: true, trim: true, maxlength: 6 },
  description: { type: String, maxlength: 500 },
  startDate: { type: Date },
  endDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Program', ProgramSchema);
