const mongoose = require('mongoose');

// One generated AI profile. Kept as history: the latest `ready` one is shown.
const ProfileSnapshotSchema = new mongoose.Schema({
  subjectKind: { type: String, enum: ['mentee', 'mentor'], required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, required: true },
  status: { type: String, enum: ['queued', 'running', 'ready', 'failed'], default: 'queued' },
  // Where it ran: a Render Workflow task run, or inside the API process.
  runner: { type: String, enum: ['render-workflow', 'in-process'], required: true },
  runId: { type: String },
  workflowError: { type: String },
  // Which writer produced the narrative, and why it fell back if it did.
  engine: { type: String, enum: ['rules', 'gemini', 'claude'] },
  model: { type: String },
  fallbackReason: { type: String },
  // Which models were tried, in order, and what happened (model fallback chain).
  modelAttempts: [{ type: String }],
  // Numbers in an AI-written narrative that don't appear in the facts.
  ungroundedNumbers: [{ type: String }],
  droppedRecommendations: { type: Number, default: 0 },
  inputsHash: { type: String, index: true },
  facts: { type: mongoose.Schema.Types.Mixed },
  badges: { type: mongoose.Schema.Types.Mixed },
  avatarSvg: { type: String },
  narrative: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
  requestedBy: { role: String, id: mongoose.Schema.Types.ObjectId },
  startedAt: Date,
  completedAt: Date,
}, { timestamps: true });

ProfileSnapshotSchema.index({ subjectKind: 1, subject: 1, createdAt: -1 });

module.exports = mongoose.model('ProfileSnapshot', ProfileSnapshotSchema);
