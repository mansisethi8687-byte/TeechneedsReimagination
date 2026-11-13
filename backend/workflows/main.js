// Render Workflow service: registers the `generateProfile` task.
//   Deployed:  a Render Workflow service with rootDir `backend`,
//              build `npm ci`, start `node workflows/main.js`,
//              env MONGO_URI (+ GEMINI_API_KEY or ANTHROPIC_API_KEY, optional).
//   Locally:   render workflows dev -- node workflows/main.js
// The API starts runs with the snapshot id it queued; this task fills that
// snapshot in using the same pipeline the API uses in-process.
require('dotenv').config();
const mongoose = require('mongoose');
const { task } = require('@renderinc/sdk/workflows');
const { runSnapshot } = require('../services/profile/generate');

let connecting;
function connect() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) connecting = mongoose.connect(process.env.MONGO_URI);
  return connecting;
}

task(
  {
    name: 'generateProfile',
    // Retries are safe: runSnapshot returns a finished snapshot unchanged.
    retry: { maxRetries: 2, waitDurationMs: 2000, backoffScaling: 2 },
    // Room for the Gemini model chain (3 x 40 s) plus database work.
    timeoutSeconds: 180,
  },
  async function generateProfile(_ctx, snapshotId) {
    await connect();
    const snap = await runSnapshot(snapshotId, { runner: 'render-workflow' });
    if (snap.status === 'failed') throw new Error(snap.error || 'profile generation failed');
    return { snapshotId: String(snap._id), status: snap.status, engine: snap.engine, badges: snap.badges.length };
  },
);
