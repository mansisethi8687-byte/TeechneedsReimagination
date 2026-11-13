process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DISABLE_RATE_LIMIT = '1';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { ensureAdmin } = require('../services/bootstrap');

let mongo;

async function startDb() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('techneeds-test'));
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

const api = () => request(app);
const auth = (token) => ({ 'x-auth-token': token });

// Builds admin -> program -> mentor -> mentee through the real HTTP API.
async function cohort({ programName = 'Web Development' } = {}) {
  await ensureAdmin({ email: 'admin@test.io', password: 'admin-pass-123' });
  const adminLogin = await api().post('/api/admin/login').send({ email: 'admin@test.io', password: 'admin-pass-123' });
  const adminToken = adminLogin.body.token;

  const program = (await api().post('/api/programs').set(auth(adminToken)).send({ name: programName })).body;
  const mentorRes = await api().post('/api/mentors').set(auth(adminToken))
    .send({ name: 'Mentor One', email: `mentor-${program._id}@test.io`, programIds: [program._id] });
  const mentorToken = (await api().post('/api/mentors/login')
    .send({ email: mentorRes.body.email, password: mentorRes.body.tempPassword })).body.token;

  const menteeRes = await api().post('/api/mentees').set(auth(mentorToken))
    .send({ name: 'Mentee One', email: `mentee-${program._id}@test.io`, programId: program._id });
  const menteeToken = (await api().post('/api/m/login')
    .send({ enrollmentNumber: menteeRes.body.mentee.enrollmentNumber, password: menteeRes.body.tempPassword })).body.token;

  return {
    adminToken, program, mentor: mentorRes.body, mentorToken,
    mentee: menteeRes.body.mentee, menteePassword: menteeRes.body.tempPassword, menteeToken,
  };
}

module.exports = { startDb, stopDb, api, auth, cohort };
