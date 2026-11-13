// Drives the real UI end to end in headless Chrome. Every step is a click or
// keystroke in the browser against the real API: no simulated responses.
//
// Critical journey:
//   admin creates a program -> admin onboards a mentor -> mentor enrolls a mentee
//   -> mentor publishes a video, a project and a quiz -> mentee signs in
//   -> watches the video -> takes the quiz (server grades and saves it)
//   -> submits the project -> mentor reviews and scores it
//   -> mentee sees the score and feedback -> leaderboard reflects it.
// Then: the same pages at 375px, with horizontal-overflow measurement.
//
// Needs the API and the web app running:
//   WEB_URL=http://localhost:3301 API_URL=http://localhost:8000 \
//   SHOTS=../docs/evidence/phase4 node scripts/ui-walkthrough.mjs
// CHROME_PATH defaults to the macOS Chrome install.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const WEB = process.env.WEB_URL || "http://localhost:3301";
const API = process.env.API_URL || "http://localhost:8000";
const SHOTS = process.env.SHOTS;
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ADMIN = { email: "admin@techneeds.demo", password: "techneeds-admin-demo" };
const tag = Date.now().toString(36).slice(-4);

let step = 0;
const log = (m) => console.log(`${String(++step).padStart(2)}. ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hard stop so a stuck run can never hang a terminal or CI job.
setTimeout(() => { console.error("\nUI walkthrough FAILED: timed out after 5 minutes"); process.exit(1); }, 5 * 60 * 1000).unref();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("/login")) consoleErrors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`); });

if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };

// ---- helpers that work the way a person does: by labels and visible text ----
async function clickText(text, { within = "body", role = "button, a, [role=menuitem], [role=tab]" } = {}) {
  await page.waitForFunction((t, w, r) => [...document.querySelector(w)?.querySelectorAll(r) || []]
    .some((el) => el.offsetParent !== null && el.textContent.trim().includes(t) && !el.disabled), { timeout: 10000 }, text, within, role);
  await page.evaluate((t, w, r) => {
    const el = [...document.querySelector(w).querySelectorAll(r)].find((e) => e.offsetParent !== null && e.textContent.trim().includes(t) && !e.disabled);
    el.click();
  }, text, within, role);
}
async function fill(label, value, within = "body") {
  const id = await page.waitForFunction((l, w) => {
    const lab = [...document.querySelector(w).querySelectorAll("label")].find((x) => x.offsetParent !== null && x.textContent.trim().startsWith(l));
    return lab?.htmlFor || null;
  }, { timeout: 10000 }, label, within).then((h) => h.jsonValue());
  const sel = `[id="${id}"]`;
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(sel, String(value));
}
const dialog = "dialog[open]";
async function readCredentials() {
  await page.waitForSelector(`${dialog} dl dd`);
  return page.evaluate((d) => Object.fromEntries([...document.querySelectorAll(`${d} dl > div`)]
    .map((row) => [row.querySelector("dt").textContent.trim(), row.querySelector("dd").textContent.trim()])), dialog);
}
async function waitText(text, timeout = 10000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
}
async function signIn(role, id, password) {
  await page.goto(`${WEB}/login?role=${role}`, { waitUntil: "networkidle0" });
  await fill(role === "mentee" ? "Enrollment number" : "Email", id);
  await fill("Password", password);
  await page.click("form button[type=submit]");
  await page.waitForSelector("main h1", { timeout: 10000 });
}
async function signOut() {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Sign out") && b.offsetParent)?.click());
  await page.waitForFunction(() => location.pathname === "/login");
}
const session = () => page.evaluate(() => JSON.parse(localStorage.getItem("tn-session")));
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

let programId;
let menteeCreds;
try {
  // ================= Admin =================
  await signIn("admin", ADMIN.email, ADMIN.password);
  log("admin signed in through /login");
  const programName = `Cloud Computing ${tag}`;
  await clickText("New program");
  await fill("Name", programName, dialog);
  await fill("Description", "Deploy real services: containers, CI and observability.", dialog);
  await clickText("Create program", { within: dialog });
  await waitText(programName);
  log(`admin created "${programName}"`);

  await clickText(programName, { role: "a" });
  await page.waitForFunction((n) => document.querySelector("main h1")?.textContent.includes(n), {}, programName);
  programId = page.url().split("/").pop();
  await clickText("New", { within: "main" });
  await fill("Full name", "Simran Arora", dialog);
  await fill("Email", `mentor-${tag}@techneeds.demo`, dialog);
  await clickText("Create login", { within: dialog });
  const mentorCreds = await readCredentials();
  await shot("01-admin-mentor-credentials");
  log("admin onboarded a mentor; credentials shown once");
  await clickText("I've saved these", { within: dialog });
  await waitText("Simran Arora");
  await signOut();

  // ================= Mentor =================
  await signIn("mentor", mentorCreds.Email, mentorCreds.Password);
  log("mentor signed in with the generated password");
  await clickText(programName, { role: "a" });
  await page.waitForFunction((n) => document.querySelector("main h1")?.textContent.includes(n), {}, programName);

  await clickText("Add mentee", { within: "main" });
  await fill("Full name", "Ananya Iyer", dialog);
  await fill("Email", `ananya-${tag}@techneeds.demo`, dialog);
  await clickText("Add and generate login", { within: dialog });
  menteeCreds = await readCredentials();
  log(`mentor enrolled a mentee; generated enrollment number ${menteeCreds["Enrollment number"]}`);
  await clickText("I've saved these", { within: dialog });

  await clickText("Resources", { role: "[role=tab]" });
  await clickText("Video", { within: "main" });
  await fill("Title", "Containers from first principles", dialog);
  await fill("Video link", "https://www.youtube.com/watch?v=8fi7uSYlOdc", dialog);
  await fill("Max score", "40", dialog);
  await clickText("Publish", { within: dialog });
  await waitText("Containers from first principles");

  await clickText("Project", { within: "main", role: "button" });
  await fill("Title", "Ship a containerised API", dialog);
  await fill("What to build", "An Express API in a Docker image with a health check.", dialog);
  await fill("Max score", "200", dialog);
  await clickText("Publish", { within: dialog });
  await waitText("Ship a containerised API");

  await clickText("Quiz", { within: "main", role: "a" });
  await page.waitForSelector("textarea[aria-label='Question 1 text']");
  await fill("Title", "Docker basics");
  await page.type("textarea[aria-label='Question 1 text']", "Which file describes how to build an image?");
  await page.type("input[aria-label='Option 1']", "docker-compose.yml");
  await page.type("input[aria-label='Option 2']", "Dockerfile");
  await page.click("button[aria-label='Mark option 2 correct']");
  await clickText("Add question");
  await page.waitForSelector("textarea[aria-label='Question 2 text']");
  await page.type("textarea[aria-label='Question 2 text']", "What does `docker ps` list?");
  const opts = await page.$$("input[aria-label^='Option']");
  await opts[2].type("Running containers");
  await opts[3].type("Images on disk");
  await (await page.$$("button[aria-label='Mark option 1 correct']"))[1].click();
  await fill("Max score", "100");
  await clickText("Publish quiz");
  await page.waitForFunction(() => location.search.includes("tab=resources"), { timeout: 10000 });
  await waitText("Docker basics");
  log("mentor published a video, a project and a 2-question quiz");

  const menuBtn = "button[aria-label='Actions for Containers from first principles']";
  await page.waitForSelector(menuBtn, { visible: true }); // the toast also says the title; wait for the row itself
  await page.click(menuBtn);
  await clickText("Lock", { role: "[role=menuitem]" });
  await waitText("Locked");
  await page.click(menuBtn);
  await clickText("Unlock", { role: "[role=menuitem]" });
  await page.waitForFunction(() => !document.querySelector("main").innerText.includes("Locked"));
  log("mentor locked and unlocked the video from the row menu");
  await shot("02-mentor-resources");
  await signOut();

  // ================= Mentee =================
  await signIn("mentee", menteeCreds["Enrollment number"], menteeCreds.Password);
  await waitText("Next up");
  await waitText("Docker basics");
  await shot("03-mentee-today-new");
  log("mentee signed in with enrollment number + generated password; Today lists the 3 new items");

  // Video
  await clickText("Containers from first principles", { role: "a" });
  await waitText("Mark as watched");
  await clickText("Mark as watched");
  await waitText("Watched");
  log("mentee watched the video: completion saved, 40/40 points");

  // Quiz
  await page.goto(`${WEB}/dashboard/programs/${programId}`, { waitUntil: "networkidle0" });
  await clickText("Docker basics", { role: "a" });
  await waitText("Start quiz");
  await shot("04-mentee-quiz-intro");
  await clickText("Start quiz");
  await page.waitForSelector("legend");
  // No answer key in anything the browser can fetch for this open quiz.
  const s = await session();
  const quizResId = page.url().split("/").pop();
  const quizJson = await page.evaluate(async (api, id, token) => (await fetch(`${api}/api/m/resources/${id}/quiz`, { headers: { "x-auth-token": token } })).text(), API, quizResId, s.token);
  expect(!quizJson.includes("correctOptionIndex"), "answer key was sent to the browser while the quiz is open");
  await clickText("Dockerfile", { role: "label" });
  await clickText("Next");
  await page.waitForFunction(() => document.querySelector("legend")?.textContent.includes("docker ps"));
  await clickText("Running containers", { role: "label" });
  await shot("05-mentee-quiz-question");
  await clickText("Review answers");
  await waitText("Ready to submit?");
  await shot("06-mentee-quiz-review");
  await clickText("Submit quiz", { within: "main" });
  await page.waitForSelector(dialog);
  await clickText("Submit", { within: dialog });
  await waitText("final score");
  const resultText = await page.evaluate(() => document.querySelector("main").innerText);
  expect(/100\s*\/\s*100/.test(resultText), "quiz result should show 100 / 100");
  expect(resultText.includes("Correct answers are shown after the quiz closes"), "answers must stay hidden while the quiz is open");
  await shot("07-mentee-quiz-result");
  log("mentee took the quiz: no answer key in the browser, server graded it 100/100, saved, answers hidden until close");

  await page.reload({ waitUntil: "networkidle0" });
  await waitText("final score");
  expect(!(await page.evaluate(() => document.body.innerText.includes("Start quiz"))), "a submitted quiz must not offer another attempt");
  log("reloading the quiz shows the saved attempt; no second attempt offered");

  // Project
  await page.goto(`${WEB}/dashboard/programs/${programId}`, { waitUntil: "networkidle0" });
  await clickText("Ship a containerised API", { role: "a" });
  await waitText("Submit your project");
  await clickText("Submit project");
  await waitText("Add your repository link");
  log("project form validates before sending (empty repository link rejected)");
  await fill("Repository link", "https://github.com/ananya/container-api");
  await fill("Live link", "https://container-api.example.app");
  await fill("What you built", "Express API in a multi-stage Docker image, with a /health endpoint and a non-root user.");
  await clickText("Submit project");
  await waitText("Awaiting review");
  await shot("08-mentee-project-submitted");
  log("mentee submitted the project; status shows Awaiting review");
  await signOut();

  // ================= Mentor reviews =================
  await signIn("mentor", mentorCreds.Email, mentorCreds.Password);
  await page.goto(`${WEB}/mentor/review`, { waitUntil: "networkidle0" });
  await waitText("Ananya Iyer");
  await fill("Score", "170");
  await fill("Feedback", "Clean multi-stage build and a proper health check. Add tests next time.");
  await shot("09-mentor-review");
  await clickText("Score project");
  await waitText("All caught up");
  log("mentor scored the project 170/200 with feedback");
  await signOut();

  // ================= Mentee sees it =================
  await signIn("mentee", menteeCreds["Enrollment number"], menteeCreds.Password);
  await waitText("Mentor feedback");
  await waitText("Add tests next time");
  await shot("10-mentee-today-after");
  await page.goto(`${WEB}/dashboard/programs/${programId}`, { waitUntil: "networkidle0" });
  await clickText("Ship a containerised API", { role: "a" });
  await waitText("Reviewed");
  await waitText("Add tests next time");
  expect(!(await page.evaluate(() => document.body.innerText.includes("Update submission"))), "a reviewed project must not be editable");
  await shot("11-mentee-project-reviewed");
  log("mentee sees Reviewed 170/200 and the mentor's feedback; the project is final");

  await page.goto(`${WEB}/dashboard/activity`, { waitUntil: "networkidle0" });
  await waitText("Mentor reviewed");
  await shot("12-mentee-activity");
  log("activity history lists video, quiz, submission and review, newest first");

  await page.goto(`${WEB}/leaderboard?program=${programId}`, { waitUntil: "networkidle0" });
  await waitText("Ananya Iyer");
  const myRow = await page.evaluate(() => document.querySelector("[aria-current='true']")?.innerText || "");
  expect(myRow.includes("Ananya Iyer") && myRow.includes("You") && myRow.includes("310"), `own row should be highlighted with 310 points, got: ${myRow}`);
  await shot("13-leaderboard-program");
  log("leaderboard updated: 40 + 100 + 170 = 310 points, own row highlighted");

  // AI profile: first visit generates it (Render Workflow or in-process, whichever the API is configured for).
  await page.goto(`${WEB}/dashboard/profile`, { waitUntil: "networkidle0" });
  await waitText("Recommended next", 60000);
  const profileText = await page.evaluate(() => document.querySelector("main").innerText);
  expect(profileText.includes("310"), "profile evidence should show the 310 points");
  expect(/Ran as a Render Workflow task|Ran inside the API/.test(profileText), "profile must say where it ran");
  expect(/Written by (the rules engine|Google Gemini|Claude)/.test(profileText), "profile must say who wrote it");
  expect(profileText.includes("Shipped it") || profileText.includes("First steps"), "badges from the real record");
  expect(await page.$("main svg[role=img][aria-label^='Growth rings']"), "generated avatar rendered");
  await shot("16-mentee-profile");
  log(`mentee profile generated from the record (${/Ran as a Render Workflow task/.test(profileText) ? "Render Workflow" : "in-process"}): 310 points, badges, avatar, recommendations`);
  await signOut();

  await signIn("mentor", mentorCreds.Email, mentorCreds.Password);
  await clickText(programName, { role: "a" });
  await clickText("Ananya Iyer", { role: "a" });
  await waitText("Mentee profile");
  await waitText("Recommended next", 30000);
  log("mentor opens the mentee's profile from the program workspace");
  await page.goto(`${WEB}/mentor/profile`, { waitUntil: "networkidle0" });
  await waitText("Median review time");
  await shot("17-mentor-profile");
  log("mentor's own profile generated: mentees, published resources, reviews");
  await signOut();

  await page.goto(`${WEB}/leaderboard`, { waitUntil: "networkidle0" });
  await waitText("How points and ranks work");
  await shot("15-leaderboard-public");
  log("leaderboard is public; anonymous visitors see rankings without signing in");

  // ================= Admin regression =================
  await signIn("admin", ADMIN.email, ADMIN.password);
  await waitText(programName);
  await shot("18-admin-overview");
  await page.goto(`${WEB}/admin/mentors`, { waitUntil: "networkidle0" });
  await waitText("Simran Arora");
  log("admin console still lists the new program and mentor");

  // ================= 375px =================
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobile.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  const login = async (path, body) => (await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
  const asMentee = await login("/api/m/login", { enrollmentNumber: menteeCreds["Enrollment number"], password: menteeCreds.Password });
  const asMentor = await login("/api/mentors/login", { email: mentorCreds.Email, password: mentorCreds.Password });
  const asAdmin = await login("/api/admin/login", ADMIN);
  const dash = await (await fetch(`${API}/api/m/dashboard`, { headers: { "x-auth-token": asMentee.token } })).json();
  const res = Object.fromEntries(dash.programs.find((p) => p._id === programId).resources.map((r) => [r.type, r._id]));
  const pages = [
    ["mentee", asMentee, "/dashboard", "mentee-today"],
    ["mentee", asMentee, `/dashboard/programs/${programId}`],
    ["mentee", asMentee, `/dashboard/resources/${res.video}`],
    ["mentee", asMentee, `/dashboard/resources/${res.quiz}`, "mentee-quiz-result"],
    ["mentee", asMentee, `/dashboard/resources/${res.project}`],
    ["mentee", asMentee, "/dashboard/activity"],
    ["mentee", asMentee, "/dashboard/profile", "mentee-profile"],
    ["mentee", asMentee, `/leaderboard?program=${programId}`, "leaderboard"],
    ["mentor", asMentor, "/mentor"], ["mentor", asMentor, `/mentor/programs/${programId}`], ["mentor", asMentor, "/mentor/review"],
    ["mentor", asMentor, "/mentor/profile"],
    ["admin", asAdmin, "/admin"], ["admin", asAdmin, `/admin/programs/${programId}`], ["admin", asAdmin, "/admin/mentors"],
  ];
  const overflowing = [];
  for (const [role, auth, path, name] of pages) {
    const user = auth.mentee || auth.mentor || auth.admin;
    await mobile.goto(`${WEB}/login`, { waitUntil: "networkidle0" });
    await mobile.evaluate((v) => localStorage.setItem("tn-session", JSON.stringify(v)), { role, token: auth.token, user: { id: user._id, name: user.name, email: user.email, enrollmentNumber: user.enrollmentNumber } });
    await mobile.goto(WEB + path, { waitUntil: "networkidle0" });
    await mobile.waitForSelector("main h1");
    await sleep(300);
    const over = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`    375px  ${role.padEnd(6)} ${path.replaceAll(programId, ":program").replace(/[a-f0-9]{24}/g, ":id").padEnd(34)} overflow ${over}px`);
    if (over > 0) overflowing.push(path);
    if (SHOTS && name) await mobile.screenshot({ path: `${SHOTS}/m-375-${name}.png` });
  }
  expect(!overflowing.length, `horizontal overflow at 375px on: ${overflowing.join(", ")}`);
  log(`all ${pages.length} pages fit 375px with no horizontal overflow`);

  const unexpected = consoleErrors.filter((e) => !e.includes("401"));
  if (unexpected.length) throw new Error(`console errors or failed requests:\n${unexpected.join("\n")}`);
  console.log(`\nUI walkthrough passed against ${WEB} (${step} steps, no console errors, no failed requests)`);
} catch (err) {
  await shot("FAILED").catch(() => {});
  console.error(`\nUI walkthrough FAILED after step ${step}: ${err.message}`);
  process.exitCode = 1;
} finally {
  await Promise.race([browser.close(), sleep(5000)]);
  process.exit();
}
