const Program = require('../models/Program');
const Resource = require('../models/Resource');
const { HttpError, notFound } = require('../middleware/errors');

const ids = (arr = []) => arr.map((x) => (x?._id || x).toString());

async function loadProgram(programId) {
  if (!programId) throw new HttpError(400, 'programId is required');
  const program = await Program.findById(programId);
  if (!program) throw notFound('Program');
  return program;
}

function mentorOwns(program, mentor) {
  return ids(program.mentors).includes(mentor._id.toString());
}

// Mentor must be assigned to the program. Admins pass.
async function requireProgramStaff(req, programId) {
  const program = await loadProgram(programId);
  if (req.role === 'admin') return program;
  if (req.role === 'mentor' && mentorOwns(program, req.user)) return program;
  throw new HttpError(403, 'Not authorized for this program');
}

// Any role that belongs to the program (admin, its mentors, its mentees).
async function requireProgramMember(req, programId) {
  const program = await loadProgram(programId);
  if (req.role === 'admin') return program;
  if (req.role === 'mentor' && mentorOwns(program, req.user)) return program;
  if (req.role === 'mentee' && ids(req.user.programs).includes(program._id.toString())) return program;
  throw new HttpError(403, 'Not authorized for this program');
}

async function loadResource(resourceId) {
  const resource = await Resource.findById(resourceId);
  if (!resource) throw notFound('Resource');
  return resource;
}

function requireMenteeInProgram(mentee, programId) {
  if (!ids(mentee.programs).includes(programId.toString())) {
    throw new HttpError(403, 'This resource is not in your program');
  }
}

module.exports = { ids, loadProgram, mentorOwns, requireProgramStaff, requireProgramMember, loadResource, requireMenteeInProgram };
