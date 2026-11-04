// node shoot.mjs name "url?query" w h dpr [--wait ms] [--clip x,y,w,h] [--mouse x,y] [--scroll y] [--rm] [--eval "js"]
import { createRequire } from "node:module";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire("/Users/f.krotovwork/Desktop/f.krotov-site's/CINEMATIC PRESENTATION/");
const puppeteer = require("puppeteer-core");
const [name, url, w, h, dpr, ...rest] = process.argv.slice(2);
const opt = (k) => { const i = rest.indexOf(`--${k}`); return i === -1 ? null : rest[i + 1] ?? true; };
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "shots");
mkdirSync(dir, { recursive: true });
const out = path.join(dir, `${name}.png`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});
const page = await browser.newPage();
const mobile = Number(w) <= 640;
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: Number(dpr), isMobile: mobile, hasTouch: mobile });
if (rest.includes("--rm")) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "load" });
await sleep(Number(opt("wait") || 1800));
if (opt("scroll")) { await page.evaluate((y) => window.scrollTo(0, Number(y)), opt("scroll")); await sleep(1200); }
if (opt("mouse")) { const [mx, my] = opt("mouse").split(",").map(Number); await page.mouse.move(mx - 40, my - 30); await page.mouse.move(mx, my, { steps: 6 }); await sleep(1500); }
let extra = null;
if (opt("eval")) extra = await page.evaluate(opt("eval"));
const clip = opt("clip") ? (([x, y, cw, ch]) => ({ x, y, width: cw, height: ch }))(opt("clip").split(",").map(Number)) : undefined;
await page.screenshot({ path: out, type: "png", clip });
const info = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth > innerWidth }));
console.log(JSON.stringify({ out, info, extra, errors: errors.slice(0, 8) }));
await browser.close();
