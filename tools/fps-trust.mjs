// node tools/fps-trust.mjs "url?trust=N"  — the logo strip: frame intervals, style/layout work while it runs, hover glide
// env: CPU=4 (throttle), PAUSE=1 (pause the strip, for comparison), EXTRA="js" (run before measuring)
import { createRequire } from "node:module";
const require = createRequire("/Users/f.krotovwork/Desktop/f.krotov-site's/CINEMATIC PRESENTATION/");
const puppeteer = require("puppeteer-core");
const [url] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "load" });
await sleep(2500);
await page.evaluate(() => { const el = document.querySelector(".trust"); scrollTo(0, el.getBoundingClientRect().top + scrollY - 380); });
await sleep(2500);
const cdp = await page.createCDPSession();
await cdp.send("Performance.enable");
await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.CPU || 1) });
const metric = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const pos = () => page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector(".logo-loop__track")).transform).m41);
if (process.env.PAUSE) await page.evaluate(() => document.getAnimations().forEach((an) => an.effect?.target?.classList?.contains("logo-loop__track") && an.pause()));
if (process.env.EXTRA) await page.evaluate(process.env.EXTRA);
const a = await metric();
const x0 = await pos();
await page.evaluate(() => { window.__f = []; let t = performance.now(); const loop = (n) => { window.__f.push(n - t); t = n; if (window.__f.length < 180) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
await sleep(3000);
const b = await metric();
const x1 = await pos();
const f = await page.evaluate(() => window.__f.slice(1));
f.sort((p, q) => p - q);
const pick = (q) => f[Math.floor(f.length * q)].toFixed(1);
const anim = await page.evaluate(() => document.getAnimations().filter((an) => an.effect?.target?.classList?.contains("logo-loop__track")).map((an) => ({ state: an.playState, rate: an.playbackRate })));
// hover: the strip should glide to a halt
const box = await page.evaluate(() => { const r = document.querySelector(".trust__loop").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await page.mouse.move(box.x, box.y + 200);
await page.mouse.move(box.x, box.y, { steps: 3 });
await sleep(900);
const h0 = await pos(); await sleep(500); const h1 = await pos();
await page.mouse.move(box.x, box.y + 300, { steps: 3 });
await sleep(900);
const l0 = await pos(); await sleep(500); const l1 = await pos();
console.log(JSON.stringify({
  frames: f.length, median: pick(0.5), p95: pick(0.95), max: f[f.length - 1].toFixed(1), over20: f.filter((v) => v > 20).length,
  moved3s: (x0 - x1).toFixed(1), recalcStyle: b.RecalcStyleCount - a.RecalcStyleCount, layout: b.LayoutCount - a.LayoutCount,
  anim, hoverMoved500ms: (h0 - h1).toFixed(2), afterLeaveMoved500ms: (l0 - l1).toFixed(2),
}));
await browser.close();
