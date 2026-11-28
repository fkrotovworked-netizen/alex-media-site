// node tools/fps-page.mjs ["url"]  — scrolls the whole page section by section and reports frame intervals
// per section, plus style/layout/script time. env: CPU=4 (CPU throttle, a weak laptop), W/H/DPR.
import { createRequire } from "node:module";
const require = createRequire("/Users/f.krotovwork/Desktop/f.krotov-site's/CINEMATIC PRESENTATION/");
const puppeteer = require("puppeteer-core");
const url = process.argv[2] || "http://localhost:5183/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(process.env.W || 1440), height: Number(process.env.H || 900), deviceScaleFactor: Number(process.env.DPR || 2) });
await page.goto(url, { waitUntil: "load" });
await sleep(3500);
if (process.env.EXTRA) await page.evaluate(process.env.EXTRA);
const cdp = await page.createCDPSession();
await cdp.send("Performance.enable");
await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.CPU || 4) });
const metric = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const sections = await page.evaluate(() =>
  [...document.querySelectorAll("main > *")].map((el) => ({
    name: el.id || el.className.toString().split(" ").slice(0, 2).join("."),
    top: el.getBoundingClientRect().top + scrollY,
    h: el.offsetHeight,
  }))
);
const rows = [];
for (const s of sections) {
  const from = Math.max(0, s.top - 900), to = s.top + s.h;
  const ms = Math.min(5000, Math.max(1500, (to - from) * 1.2));
  const a = await metric();
  const r = await page.evaluate((from, to, ms) => new Promise((res) => {
    const d = []; const t0 = performance.now(); let last = t0;
    const tick = (now) => {
      d.push(now - last); last = now;
      const k = Math.min(1, (now - t0) / ms);
      scrollTo(0, from + (to - from) * k);
      if (k < 1) requestAnimationFrame(tick);
      else { d.shift(); d.sort((x, y) => x - y); res({ n: d.length, avg: d.reduce((x, y) => x + y, 0) / d.length, p95: d[Math.floor(d.length * 0.95)], max: d[d.length - 1], over20: d.filter((v) => v > 20).length }); }
    };
    requestAnimationFrame(tick);
  }), from, to, ms);
  const b = await metric();
  const per = (k) => (((b[k] - a[k]) * 1000) / r.n).toFixed(1);
  rows.push({ section: s.name.slice(0, 28), frames: r.n, fps: +(1000 / r.avg).toFixed(0), p95: +r.p95.toFixed(1), max: +r.max.toFixed(0), slow: r.over20, "script/f": per("ScriptDuration"), "style/f": per("RecalcStyleDuration"), "layout/f": per("LayoutDuration") });
}
console.table(rows);
await browser.close();
