"use client";
// One session record for every role, in localStorage under `tn-session`:
// { role: 'admin'|'mentor'|'mentee', token, user }.
// Upstream used separate keys (token + mentor, menteeToken); those are read
// once and migrated so existing signed-in users stay signed in.
import { useSyncExternalStore } from "react";

const KEY = "tn-session";
const LEGACY_KEYS = ["token", "mentor", "menteeToken", "selectedProgram", "mentorToken"];
const listeners = new Set();
let cache;

function readStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    // Migrate upstream keys.
    const menteeToken = localStorage.getItem("menteeToken");
    const mentorToken = localStorage.getItem("token");
    let migrated = null;
    if (mentorToken) {
      let user = null;
      try { user = JSON.parse(localStorage.getItem("mentor")); } catch { /* ignore */ }
      migrated = { role: "mentor", token: mentorToken, user };
    } else if (menteeToken) {
      migrated = { role: "mentee", token: menteeToken, user: null };
    }
    if (migrated) {
      localStorage.setItem(KEY, JSON.stringify(migrated));
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    }
    return migrated;
  } catch {
    return null;
  }
}

export function getSession() {
  if (typeof window === "undefined") return null;
  if (cache === undefined) cache = readStorage();
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

export function setSession(session) {
  cache = session;
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch { /* private mode: session lives for this tab only */ }
  emit();
}

export function updateSessionUser(user) {
  const s = getSession();
  if (s) setSession({ ...s, user: { ...s.user, ...user } });
}

export function clearSession() {
  setSession(null);
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = readStorage();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// `undefined` during SSR and the first client render (not known yet), then the session or null.
export function useSession() {
  return useSyncExternalStore(subscribe, getSession, () => undefined);
}

export const ROLE_HOME = { admin: "/admin", mentor: "/mentor", mentee: "/dashboard" };
export const ROLE_LABEL = { admin: "Admin", mentor: "Mentor", mentee: "Mentee" };
