const mongoose = require('mongoose');
const hidePassword = require('./plugins/hidePassword');

const MenteeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  enrollmentNumber: { type: String, required: true, trim: true },
  // bcrypt hash. Legacy plaintext values are upgraded on the next successful login.
  password: { type: String, required: true },
  programs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  }],
  completedResources: [{
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
    completedOn: { type: Date, default: Date.now },
    score: { type: Number, default: 0 },

    // Optional fields for project resources
    githubLink: { type: String },
    deployedLink: { type: String },
    description: { type: String },
    submittedOn: { type: Date },
    verified:{type: Boolean, default:false},
    // Added: mentor's note when scoring a project.
    feedback: { type: String, maxlength: 1000 },
    verifiedAt: { type: Date },
  }],
  streak: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  lastActiveDate: { type: Date },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mentor',
  },
  // Added: inputs to the AI profile.
  interests: [{ type: String, lowercase: true, trim: true, maxlength: 32 }],
  bio: { type: String, maxlength: 280 },
}, { timestamps: true });

MenteeSchema.index({ email: 1, enrollmentNumber: 1 }, { unique: true });
// Added: enrollment numbers identify a login, so they must be unique on their own.
MenteeSchema.index({ enrollmentNumber: 1 }, { unique: true });

MenteeSchema.plugin(hidePassword);

module.exports = mongoose.model('Mentee', MenteeSchema);
