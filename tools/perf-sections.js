(async () => {
  const run = (label, drive, ms) => new Promise((resolve) => {
    const deltas = []; let last = performance.now(); const start = last;
    const tick = (now) => {
      deltas.push(now - last); last = now;
      drive((now - start) / ms);
      if (now - start < ms) requestAnimationFrame(tick);
      else {
        deltas.shift(); deltas.sort((a, b) => a - b);
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        resolve({ label, frames: deltas.length, over34: deltas.filter((v) => v > 34).length, avg: +avg.toFixed(1), p95: +deltas[Math.floor(deltas.length * 0.95)].toFixed(1), max: +deltas[deltas.length - 1].toFixed(1) });
      }
    };
    requestAnimationFrame(tick);
  });
  const top = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY;
  const move = (x, y) => window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  // light sheets opening and lifting off over the graphite
  const a = top('.stats') - innerHeight, b = top('#cases');
  out.push(await run('scroll stats → services → ai (sheets)', (k) => scrollTo(0, a + (b - a) * k), 4000));
  const c = top('.cases'), d = top('#process');
  out.push(await run('wheel: scroll through all cases', (k) => scrollTo(0, c + (d - c - innerHeight) * k), 6000));
  scrollTo(0, top('#process')); await sleep(600);
  const cells = document.querySelectorAll('.track__cell'); let n = 0;
  out.push(await run('process: lens between stages', (k) => { const i = Math.floor(k * 9) % 5; if (i !== n) { n = i; cells[i].click(); } }, 3000));
  const e = top('#about') - innerHeight, f = top('#contact') + 200;
  out.push(await run('scroll about → prices → reviews → faq → final', (k) => scrollTo(0, e + (f - e) * k), 5000));
  scrollTo(0, top('#faq')); await sleep(600);
  const qs = document.querySelectorAll('.faq__q'); let m = -1;
  out.push(await run('faq: open and close', (k) => { const i = Math.floor(k * 8) % qs.length; if (i !== m) { m = i; qs[i].click(); } }, 2500));
  scrollTo(0, 0); await sleep(800);
  out.push(await run('pointer over hero', (k) => move(200 + 1000 * (0.5 + 0.5 * Math.sin(k * 9)), 200 + 500 * (0.5 + 0.5 * Math.cos(k * 7))), 2500));
  return { dpr: devicePixelRatio, canvases: [...document.querySelectorAll('canvas')].map((c) => c.width + 'x' + c.height), runs: out };
})()
