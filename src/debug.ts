// URL switches for reviewing the page frame by frame:
//   ?t=1.2   freeze the entrance timeline at 1.2 s
//   ?fps     show a frame-time readout
//   ?nogl    use the static version (as if WebGL were unavailable)
//   ?rm      behave as with reduced motion
const params = new URLSearchParams(window.location.search);
const number = (key: string) => {
  const raw = params.get(key);
  if (raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const debug = {
  t: number('t'),
  fps: params.has('fps'),
  noGl: params.has('nogl'),
  reducedMotion: params.has('rm')
};
