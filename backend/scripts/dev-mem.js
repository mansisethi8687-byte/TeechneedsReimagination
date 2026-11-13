// Zero-setup local backend: in-memory MongoDB + demo seed + API on :8000.
// Data lives only while this process runs. For persistent data use `npm run dev` with MONGO_URI.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

(async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('techneeds');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';

  const { env } = require('../config/env');
  const app = require('../app');
  const { seed } = require('./seed');

  await mongoose.connect(env.MONGO_URI);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const creds = await seed();

  const server = app.listen(env.PORT, () => {
    console.log(`TechNeeds API (in-memory) on http://localhost:${env.PORT}`);
    console.log(`Admin   ${creds.admin.email} / ${creds.admin.password}`);
    for (const m of creds.mentors) console.log(`Mentor  ${m.email} / ${m.password}  (${m.program})`);
    console.log(`Mentee  ${creds.mentees[0].enrollmentNumber} / ${creds.mentees[0].password}  ${creds.mentees[0].name}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
