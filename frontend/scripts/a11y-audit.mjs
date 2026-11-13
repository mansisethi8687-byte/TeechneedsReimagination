// Runs axe-core (WCAG 2.1 A/AA rules) in Chrome on every page, signed out and
// as each role, in dark and light themes. Uses the seeded demo accounts.
//   WEB_URL=http://localhost:3301 API_URL=http://localhost:8000 node scripts/a11y-audit.mjs
// Exits non-zero if any serious or critical violation is found.
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const WEB = process.env.WEB_URL || "http://localhost:3301";
const API = process.env.API_URL || "http://localhost:8000";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const post = (p, b) => fetch(API + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());
const get = (p, t) => fetch(API + p, { headers: { "x-auth-token": t } }).then((r) => r.json());

const mentee = await post("/api/m/login", { enrollmentNumber: "TN-WD26-001", password: "mentee-demo-2026" });
const mentor = await post("/api/mentors/login", { email: "ishita@techneeds.demo", password: "mentor-demo-2026" });
const admin = await post("/api/admin/login", { email: "admin@techneeds.demo", password: "techneeds-admin-demo" });
const dash = await get("/api/m/dashboard", mentee.token);
const wd = dash.programs[0];
const byType = (t) => wd.resources.find((r) => r.type === t);
const session = (role, res) => { const u = res[role]; return { role, token: res.token, user: { id: u._id, name: u.name, email: u.email, enrollmentNumber: u.enrollmentNumber } }; };

const PAGES = [
  [null, "/"], [null, "/team"], [null, "/faq"], [null, "/techboard"], [null, "/eventspage"], [null, "/login"], [null, "/leaderboard"],
  [session("mentee", mentee), "/dashboard"], [session("mentee", mentee), `/dashboard/programs/${wd._id}`],
  [session("mentee", mentee), `/dashboard/resources/${byType("video")._id}`], [session("mentee", mentee), `/dashboard/resources/${byType("quiz")._id}`],
  [session("mentee", mentee), `/dashboard/resources/${byType("project")._id}`], [session("mentee", mentee), "/dashboard/activity"],
  [session("mentee", mentee), "/dashboard/profile"],
  [session("mentor", mentor), "/mentor"], [session("mentor", mentor), `/mentor/programs/${wd._id}`], [session("mentor", mentor), `/mentor/programs/${wd._id}?tab=resources`],
  [session("mentor", mentor), `/mentor/programs/${wd._id}/quiz/new`], [session("mentor", mentor), "/mentor/review"], [session("mentor", mentor), "/mentor/profile"],
  [session("admin", admin), "/admin"], [session("admin", admin), `/admin/programs/${wd._id}`], [session("admin", admin), "/admin/mentors"],
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let serious = 0;
const summary = new Map();
for (const scheme of ["dark", "light"]) {
  for (const [s, path] of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
    await page.goto(`${WEB}/login`, { waitUntil: "networkidle0" });
    await page.evaluate((v) => { localStorage.clear(); if (v) localStorage.setItem("tn-session", JSON.stringify(v)); }, s);
    await page.goto(WEB + path, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 700));
    await page.addScriptTag({ content: AXE });
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + (n.any?.[0]?.message ? ` — ${n.any[0].message}` : "")), count: v.nodes.length }));
    });
    const bad = result.filter((v) => ["serious", "critical"].includes(v.impact));
    serious += bad.length;
    const label = `${scheme.padEnd(5)} ${(s?.role || "public").padEnd(6)} ${path.replace(/[a-f0-9]{24}/g, ":id")}`;
    console.log(`${bad.length ? "FAIL" : result.length ? "warn" : " ok "}  ${label}${result.length ? `  (${result.map((v) => `${v.id}:${v.impact}×${v.count}`).join(", ")})` : ""}`);
    for (const v of bad) for (const n of v.nodes) console.log(`        ${v.id}: ${n}`);
    for (const v of result) summary.set(v.id, (summary.get(v.id) || 0) + v.count);
    await page.close();
  }
}
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
console.log(`\n${PAGES.length * 2} page checks. Serious/critical violations: ${serious}. All findings by rule: ${JSON.stringify(Object.fromEntries(summary))}`);
process.exit(serious ? 1 : 0);
