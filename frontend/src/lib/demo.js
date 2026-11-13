// Demo accounts created by backend/scripts/seed.js. These are test values for
// the seeded demo database only. The "Use demo account" buttons appear only
// when NEXT_PUBLIC_DEMO_LOGINS=1, so a real deployment never shows them.
export const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGINS === "1";

export const DEMO_ACCOUNTS = {
  mentee: { id: "TN-WD26-001", password: "mentee-demo-2026", who: "Aanya Gupta · Web Development" },
  mentor: { id: "ishita@techneeds.demo", password: "mentor-demo-2026", who: "Ishita Malhotra · Web Development" },
  admin: { id: "admin@techneeds.demo", password: "techneeds-admin-demo", who: "TechNeeds core team" },
};
