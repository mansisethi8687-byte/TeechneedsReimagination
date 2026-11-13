const { env, assertRuntimeEnv } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const { ensureAdmin } = require('./services/bootstrap');

async function start() {
  assertRuntimeEnv();
  await connectDB(env.MONGO_URI);
  // Optional demo data for a fresh deployment (free Render plans have no shell
  // to run the seed script). Only ever seeds an empty database.
  if (process.env.SEED_DEMO === 'true') {
    const Program = require('./models/Program');
    if ((await Program.estimatedDocumentCount()) === 0) {
      await require('./scripts/seed').seed();
      console.log('SEED_DEMO: empty database, seeded the demo cohort.');
    }
  }
  await ensureAdmin({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME });
  return app.listen(env.PORT, () => console.log(`Server running on port ${env.PORT}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { app, start };
