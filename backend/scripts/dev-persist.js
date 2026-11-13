// Local backend on a PERSISTENT MongoDB: a real mongod (WiredTiger) whose data
// files live in backend/.data/<name>, so everything survives restarts.
// Seeds the demo cohort only when the database is empty.
//   npm run dev:persist                 -> data in backend/.data/mongo, API on :8000
//   DATA_DIR=.data/other PORT=8131 MONGO_PORT=27031 node scripts/dev-persist.js
// For a hosted database (MongoDB Atlas) use `npm start` with MONGO_URI instead.
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

(async () => {
  const dbPath = path.resolve(__dirname, '..', process.env.DATA_DIR || '.data/mongo');
  fs.mkdirSync(dbPath, { recursive: true });
  const mongo = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger', port: Number(process.env.MONGO_PORT) || 27027 },
  });
  process.env.MONGO_URI = mongo.getUri('techneeds');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';

  const { env } = require('../config/env');
  const app = require('../app');
  const { seed } = require('./seed');
  const Program = require('../models/Program');

  await mongoose.connect(env.MONGO_URI);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  // SEED_DEMO=false starts a clean database: no demo cohort, only the admin
  // from ADMIN_EMAIL / ADMIN_PASSWORD (backend/.env). Real users are then
  // created through the app: admin -> mentor -> mentee.
  const existing = await Program.estimatedDocumentCount();
  if (process.env.SEED_DEMO === 'false') {
    console.log(`Clean mode (SEED_DEMO=false): no demo data. ${existing} programs in this database.`);
  } else if (existing === 0) {
    await seed();
    console.log('Empty database: seeded the demo cohort.');
  } else {
    console.log(`Existing data found (${existing} programs): not reseeding.`);
  }
  const { ensureAdmin } = require('../services/bootstrap');
  const admin = await ensureAdmin({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME });
  if (admin) console.log(`Admin account ready: ${admin.email}`);

  const server = app.listen(env.PORT, () => {
    console.log(`TechNeeds API (persistent MongoDB at ${dbPath}) on http://localhost:${env.PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    // Keep the data files: never clean up a user-provided dbPath.
    await mongo.stop({ doCleanup: false, force: false });
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
