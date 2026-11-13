// Single API client. Base URL comes from NEXT_PUBLIC_API_URL; the problem
// statement's local setup runs the backend on http://localhost:8000.
// Upstream export names below the `api` object are kept so older callers compile.
import { getSession, clearSession } from "./session";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function request(path, { method = "GET", body, token, auth = true, signal } = {}) {
  const session = auth ? getSession() : null;
  const t = token ?? session?.token;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(t ? { "x-auth-token": t } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, "Can't reach the server. If it's on Render's free plan it may be waking up — try again in a few seconds.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // An expired or revoked token: sign out so guards send the user to /login.
    if (res.status === 401 && t && session?.token === t) clearSession();
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data?.details);
  }
  return data;
}

const get = (p, o) => request(p, o);
const post = (p, body, o) => request(p, { ...o, method: "POST", body: body ?? {} });
const patch = (p, body, o) => request(p, { ...o, method: "PATCH", body: body ?? {} });
const del = (p, o) => request(p, { ...o, method: "DELETE" });

export const api = {
  health: () => get("/api/health", { auth: false }),
  stats: () => get("/api/stats", { auth: false }),

  auth: {
    admin: (email, password) => post("/api/admin/login", { email, password }, { auth: false }),
    mentor: (email, password) => post("/api/mentors/login", { email, password }, { auth: false }),
    mentee: (enrollmentNumber, password) => post("/api/m/login", { enrollmentNumber, password }, { auth: false }),
  },

  admin: {
    me: () => get("/api/admin/me"),
    overview: () => get("/api/admin/overview"),
    programs: () => get("/api/admin/programs"),
    createProgram: (data) => post("/api/programs", data),
    updateProgram: (id, data) => patch(`/api/admin/programs/${id}`, data),
    mentors: () => get("/api/mentors"),
    createMentor: (data) => post("/api/mentors", data),
    assignMentor: (programId, mentorId) => post(`/api/programs/${programId}/add-mentor`, { mentorId }),
    removeMentor: (programId, mentorId) => post(`/api/admin/programs/${programId}/remove-mentor`, { mentorId }),
    resetMentorPassword: (id) => post(`/api/admin/mentors/${id}/reset-password`),
  },

  mentor: {
    me: () => get("/api/mentors/me"),
    updateMe: (data) => patch("/api/mentors/me", data),
    program: (id) => get(`/api/programs/${id}`),
    mentees: (programId) => get(`/api/${programId}/mentees`),
    resources: (programId) => get(`/api/${programId}/resources`),
    addMentee: (data) => post("/api/mentees", data),
    resetMenteePassword: (id) => post(`/api/mentees/${id}/reset-password`),
    addResource: (data) => post("/api/resources", data),
    addQuiz: (data) => post("/api/resources/quiz", data),
    resource: (id) => get(`/api/resources/${id}`),
    updateResource: (id, data) => patch(`/api/resources/${id}`, data),
    deleteResource: (id) => del(`/api/resources/${id}`),
    submissions: (id) => get(`/api/resources/${id}/submissions`),
    reviewQueue: () => get("/api/unverified-projects"),
    verifyProject: (menteeId, resourceId, score, feedback) => patch(`/api/${menteeId}/resources/${resourceId}/verify`, { score, feedback }),
  },

  mentee: {
    dashboard: () => get("/api/m/dashboard"),
    resource: (id) => get(`/api/m/resources/${id}`),
    activity: () => get("/api/m/activity"),
    me: () => get("/api/m/me"),
    updateMe: (data) => patch("/api/m/me", data),
    complete: (resourceId) => post(`/api/m/resources/${resourceId}/complete`),
    quiz: (resourceId) => get(`/api/m/resources/${resourceId}/quiz`),
    submitQuiz: (resourceId, answers) => post(`/api/m/resources/${resourceId}/quiz/submit`, { answers }),
    submitProject: (resourceId, data) => post(`/api/m/resources/${resourceId}/project`, data),
  },

  profile: {
    get: (kind, id) => get(`/api/profile/${kind}/${id}`),
    generate: (kind, id, force = false) => post(`/api/profile/${kind}/${id}/generate`, { force }),
    job: (snapshotId) => get(`/api/profile/jobs/${snapshotId}`),
  },

  leaderboard: ({ program, limit = 50, skip = 0 } = {}) => {
    const q = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (program) q.set("program", program);
    return get(`/api/m/leaderboard?${q}`, { auth: false });
  },
  programs: () => get("/api/programs", { auth: false }),
};

// ---- Upstream exports (same names and arguments) ----
export const createProgram = (name) => api.admin.createProgram({ name });
export const createMentor = (data) => api.admin.createMentor(data);
export const addMentorToProgram = (programId, mentorId) => api.admin.assignMentor(programId, mentorId);
export const getAllPrograms = () => api.programs();
export const getAllMentors = () => api.admin.mentors();
export const mentorLogin = (email, password) => api.auth.mentor(email, password);
export const addMentee = (token, data) => request("/api/mentees", { method: "POST", body: data, token });
export const addResource = (token, data, isQuiz = false) =>
  request(isQuiz ? "/api/resources/quiz" : "/api/resources", { method: "POST", body: data, token });
export const getMentorDetails = (token) => request("/api/mentors/me", { token });
export const getProgramMentees = (programId, token) => request(`/api/${programId}/mentees`, { token });
export const getProgramResources = (programId, token) => request(`/api/${programId}/resources`, { token });
