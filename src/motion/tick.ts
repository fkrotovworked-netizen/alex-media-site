// The detent of the case wheel, as a sound: the soft dry tick of a picker wheel,
// made with Web Audio — no file to load. It is a few milliseconds of filtered noise
// with a short fixed-pitch knock under it; nothing in it glides in pitch, because a
// gliding tone is what makes a click sound synthetic. Browsers only let a page make sound after the visitor has
// clicked, tapped or pressed a key somewhere on it; scrolling alone does not count,
// so until then the wheel turns silently.

let context: AudioContext | null = null;
let pending = false;
let last = 0;
let grain: AudioBuffer | null = null;

// Creating an AudioContext opens the audio device: ~90 ms of blocked main thread.
// So it is made only for a visitor who has turned the wheel, never inside a click or
// while anything they started may still be moving: only after the page has had a
// moment without scrolling, pointer movement, clicks, keys or touches. Until then the wheel is silent.
let lastActivity = 0;
const QUIET = 900;

const prepare = () => {
  if (context || pending) return;
  pending = true;
  const create = () => {
    if (performance.now() - lastActivity < QUIET) return wait();
    pending = false;
    try {
      context = new AudioContext();
    } catch {
      context = null;
    }
  };
  const wait = () =>
    window.setTimeout(() => {
      if (performance.now() - lastActivity < QUIET) return wait();
      if ('requestIdleCallback' in window) window.requestIdleCallback(create);
      else create();
    }, QUIET / 2);
  wait();
};

const unlock = () => {
  lastActivity = performance.now();
  // resuming is cheap, and some browsers allow it only inside the gesture itself
  if (context?.state === 'suspended') void context.resume();
};

// Which event carries the permission differs by browser and by input: for a mouse it
// is mousedown / pointerup / click, not pointerdown; for touch it is touchend.
if (typeof window !== 'undefined') {
  const busy = () => (lastActivity = performance.now());
  // the pointer moves the light and the camera, so a moving pointer counts as motion too
  for (const type of ['scroll', 'wheel', 'pointerdown', 'pointermove', 'touchstart'] as const) {
    window.addEventListener(type, busy, { capture: true, passive: true });
  }
  for (const type of ['mousedown', 'pointerup', 'click', 'touchend', 'keydown'] as const) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
}

/** A few milliseconds of noise that dies away at once: the "material" of the tick. */
const noise = (ctx: AudioContext) => {
  if (grain) return grain;
  const length = Math.round(ctx.sampleRate * 0.02);
  grain = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = grain.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0022));
  }
  return grain;
};

/** One tick. Throttled, so a fast spin ticks like a ratchet instead of buzzing. */
export const tick = () => {
  // the visitor may have interacted before this module was listening
  if (!context && navigator.userActivation?.hasBeenActive) prepare();
  if (!context || context.state !== 'running') return;
  const now = performance.now();
  if (now - last < 55) return;
  last = now;

  const ctx = context;
  const t = ctx.currentTime;
  // no two ticks of a real mechanism are identical
  const vary = 0.96 + Math.random() * 0.08;

  const out = ctx.createGain();
  out.gain.value = 0.5;
  out.connect(ctx.destination);

  // the tick itself: noise narrowed to the band where a small plastic part clicks
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2600 * vary;
  band.Q.value = 0.9;
  source.connect(band).connect(out);
  source.start(t);

  // a quiet knock under it, at one pitch, gone in ten milliseconds: weight, not a tone
  const knock = ctx.createOscillator();
  const knockGain = ctx.createGain();
  knock.type = 'sine';
  knock.frequency.value = 620 * vary;
  knockGain.gain.setValueAtTime(0.0001, t);
  knockGain.gain.exponentialRampToValueAtTime(0.22, t + 0.001);
  knockGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
  knock.connect(knockGain).connect(out);
  knock.start(t);
  knock.stop(t + 0.02);
};
