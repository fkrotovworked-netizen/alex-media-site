// node tools/fps-folder.mjs url scrollY x,y  — frame intervals while a hover animation plays
import { createRequire } from "node:module";
const require = createRequire("/Users/f.krotovwork/Desktop/f.krotov-site's/CINEMATIC PRESENTATION/");
const puppeteer = require("puppeteer-core");
const [url, sy, xy] = process.argv.slice(2);
const [x, y] = xy.split(",").map(Number);
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
await page.evaluate((v) => window.scrollTo(0, Number(v)), sy);
await sleep(1500);
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.CPU || 1) });
await page.evaluate(() => { window.__f = []; let t = performance.now(); const loop = (n) => { window.__f.push(n - t); t = n; if (window.__f.length < 150) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
if (!process.env.IDLE) { await page.mouse.move(x - 60, y + 200);
await page.mouse.move(x, y, { steps: 4 });
await sleep(1200);
await page.mouse.move(x - 60, y + 400, { steps: 4 }); }
await sleep(1200);
const f = await page.evaluate(() => window.__f.slice(1));
f.sort((a, b) => a - b);
const pick = (q) => f[Math.floor(f.length * q)].toFixed(1);
console.log(JSON.stringify({ frames: f.length, median: pick(0.5), p95: pick(0.95), max: f[f.length - 1].toFixed(1), over20: f.filter((v) => v > 20).length }));
await browser.close();
