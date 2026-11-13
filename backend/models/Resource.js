const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'quiz', 'project'], required: true },
  url: { type: String },
  deadline: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  maxScore: { type: Number, default: 300, min: 0 },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  isLocked: { type: Boolean, default: false },
  // Added: upstream routes already wrote `addedBy`, but the schema dropped it.
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
  description: { type: String, maxlength: 2000 },
  // Topic tags feed per-topic mastery on the AI profile.
  tags: [{ type: String, lowercase: true, trim: true, maxlength: 32 }],
}, { timestamps: true });

module.exports = mongoose.model('Resource', ResourceSchema);
