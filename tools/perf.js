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
        resolve({ label, frames: deltas.length, avg: +avg.toFixed(1), p95: +deltas[Math.floor(deltas.length * 0.95)].toFixed(1), max: +deltas[deltas.length - 1].toFixed(1) });
      }
    };
    requestAnimationFrame(tick);
  });
  const move = (x, y) => window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
  const out = [];
  out.push(await run('pointer over hero', (k) => move(200 + 1000 * (0.5 + 0.5 * Math.sin(k * 9)), 200 + 500 * (0.5 + 0.5 * Math.cos(k * 7))), 2500));
  out.push(await run('scroll through morph', (k) => window.scrollTo(0, k * 1100), 3000));
  out.push(await run('pointer over slab', (k) => move(300 + 900 * (0.5 + 0.5 * Math.sin(k * 9)), 300 + 400 * (0.5 + 0.5 * Math.cos(k * 7))), 2500));
  const c = document.querySelector('canvas');
  return { canvas: c.width + 'x' + c.height, dpr: devicePixelRatio, runs: out };
})()
