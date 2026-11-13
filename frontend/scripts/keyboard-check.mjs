// Keyboard-only path through the core mentee flow: no mouse events at all.
// Sign in with Enter, Tab to "Start quiz", answer with arrow keys, move on
// with the keyboard, check focus moves to each question. Does not submit.
//   WEB_URL=http://localhost:3301 node scripts/keyboard-check.mjs
import puppeteer from "puppeteer-core";

const WEB = process.env.WEB_URL || "http://localhost:3301";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const ok = (m) => console.log(`PASS  ${m}`);
const active = () => page.evaluate(() => ({ tag: document.activeElement?.tagName, text: (document.activeElement?.innerText || document.activeElement?.getAttribute("aria-label") || "").trim().slice(0, 60), type: document.activeElement?.type }));

async function tabTo(predicate, label, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const a = await active();
    if (predicate(a)) return a;
  }
  throw new Error(`could not reach ${label} with Tab`);
}

try {
  await page.goto(`${WEB}/login?role=mentee`, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await tabTo((a) => a.tag === "INPUT" && a.type === "text", "enrollment field");
  await page.keyboard.type("TN-WD26-002");
  await page.keyboard.press("Tab");
  await page.keyboard.type("mentee-demo-2026");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 10000 });
  ok("signed in using only Tab, typing and Enter");

  await page.waitForFunction(() => document.body.innerText.includes("Take quiz"));
  const link = await tabTo((a) => a.tag === "A" && a.text.includes("React mental model"), "the quiz in Next up");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.body.innerText.includes("Start quiz"), { timeout: 10000 });
  ok(`opened "${link.text.split("\n")[0]}" from Next up with Enter`);

  await tabTo((a) => a.tag === "BUTTON" && a.text.includes("Start quiz"), "Start quiz");
  await page.keyboard.press("Enter");
  await page.waitForSelector("legend");
  const focused = await active();
  if (focused.tag !== "LEGEND") throw new Error(`focus should move to the question, got ${focused.tag}`);
  ok("Start quiz with Enter; focus moved to question 1");

  await tabTo((a) => a.tag === "INPUT" && a.type === "radio", "the answer options");
  await page.keyboard.press("ArrowDown");
  const answered = await page.$eval("[aria-label='Questions answered']", (el) => el.getAttribute("aria-valuenow"));
  if (answered !== "1") throw new Error(`expected 1 answered, got ${answered}`);
  ok("chose an answer with the arrow keys (progress shows 1 answered)");

  await tabTo((a) => a.tag === "BUTTON" && a.text.startsWith("Next"), "Next");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.activeElement?.tagName === "LEGEND" && document.activeElement.innerText.includes("hook"));
  ok("Next with Enter; focus moved to question 2");

  const ring = await page.evaluate(() => {
    const el = [...document.querySelectorAll("main button")].find((b) => b.innerText.startsWith("Previous"));
    el.focus();
    const cs = getComputedStyle(el);
    return `${cs.outlineStyle} ${cs.outlineWidth}`;
  });
  if (!ring.startsWith("solid")) throw new Error(`no visible focus ring: ${ring}`);
  ok(`focused controls show a visible focus ring (${ring})`);
  console.log("\nKeyboard check passed (quiz left unsubmitted; answers are only a device draft)");
} catch (err) {
  console.error(`\nKeyboard check FAILED: ${err.message}`);
  process.exitCode = 1;
} finally {
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("tn-quiz-draft")) localStorage.removeItem(k); }).catch(() => {});
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 4000))]);
  process.exit();
}
