// Chooses where a profile is generated.
//   Render Workflow: when RENDER_WORKFLOW_SLUG is set and either RENDER_API_KEY
//   (deployed) or RENDER_USE_LOCAL_DEV / RENDER_LOCAL_DEV_URL (the Render CLI's
//   local task server) is configured. The API queues a snapshot, starts the
//   `generateProfile` task with the snapshot id, and the client polls.
//   In-process: otherwise. The API runs the same pipeline itself.
// If the workflow can't be started, or its run fails, the API falls back to
// in-process generation and records why on the snapshot.
const { runSnapshot } = require('./generate');
const ProfileSnapshot = require('../../models/ProfileSnapshot');

const TASK = 'generateProfile';

function workflowConfig() {
  const slug = process.env.RENDER_WORKFLOW_SLUG;
  const local = ['1', 't', 'true'].includes(String(process.env.RENDER_USE_LOCAL_DEV || '').toLowerCase()) || !!process.env.RENDER_LOCAL_DEV_URL;
  if (!slug || !(process.env.RENDER_API_KEY || local)) return null;
  return { taskSlug: `${slug}/${TASK}`, local };
}

let client;
function renderClient() {
  if (!client) {
    const { Render } = require('@renderinc/sdk');
    client = new Render();
  }
  return client;
}

async function startWorkflow(snap, cfg) {
  const run = await renderClient().workflows.startTask(cfg.taskSlug, [String(snap._id)], { idempotencyKey: `profile-${snap._id}` });
  snap.runId = run.taskRunId;
  snap.status = 'queued';
  await snap.save();
  return snap;
}

// Called by the API on POST .../generate.
async function requestProfile({ subjectKind, subjectId, requestedBy }) {
  const cfg = workflowConfig();
  const snap = await ProfileSnapshot.create({
    subjectKind, subject: subjectId, runner: cfg ? 'render-workflow' : 'in-process', status: 'queued', requestedBy,
  });
  if (!cfg) return runSnapshot(snap._id, { runner: 'in-process' });
  try {
    return await startWorkflow(snap, cfg);
  } catch (err) {
    snap.workflowError = `Could not start workflow task: ${err.message}`.slice(0, 300);
    await snap.save();
    return runSnapshot(snap._id, { runner: 'in-process' });
  }
}

// Called while the client polls. Reflects the workflow run's state, and falls
// back to in-process if the run failed or was canceled.
async function refreshJob(snap) {
  if (snap.runner !== 'render-workflow' || !snap.runId || ['ready', 'failed'].includes(snap.status)) return snap;
  let details;
  try {
    details = await renderClient().workflows.getTaskRun(snap.runId);
  } catch (err) {
    return snap; // transient: keep polling
  }
  if (['failed', 'canceled'].includes(details.status)) {
    snap.workflowError = `Workflow run ${details.status}: ${details.error || 'no error message'}`.slice(0, 300);
    await snap.save();
    return runSnapshot(snap._id, { runner: 'in-process' });
  }
  // The task writes the snapshot itself; re-read it.
  return ProfileSnapshot.findById(snap._id);
}

// Test seam: swap the Render client for a stub.
function __setRenderClient(c) { client = c; }

module.exports = { requestProfile, refreshJob, workflowConfig, TASK, __setRenderClient };
