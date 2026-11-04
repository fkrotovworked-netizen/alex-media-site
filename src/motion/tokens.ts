// One motion language for the DOM and the shader.
// Springs are described the way Apple does: damping ratio + response (seconds).

export interface SpringToken {
  response: number;
  damping: number;
}

// Nothing here overshoots: no interaction in the prototype carries momentum.
export const springs = {
  light: { response: 0.7, damping: 1 },
  camera: { response: 0.55, damping: 1 },
  follow: { response: 0.34, damping: 1 },
  ui: { response: 0.4, damping: 1 },
  // a long, soft travel: the lens of the process track
  glide: { response: 0.55, damping: 1 },
  reveal: { response: 0.3, damping: 1 }
} satisfies Record<string, SpringToken>;

/** Physical spring options for Motion's `useSpring`. */
export const toMotion = ({ response, damping }: SpringToken) => {
  const omega = (2 * Math.PI) / response;
  return { stiffness: omega * omega, damping: 2 * damping * omega, mass: 1 };
};

/** Step response of a critically damped spring: how far along it is t seconds after release. */
export const settle = (t: number, response: number) => {
  if (t <= 0) return 0;
  const w = (2 * Math.PI) / response;
  return 1 - (1 + w * t) * Math.exp(-w * t);
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
