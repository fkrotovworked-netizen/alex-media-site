// From React Bits (reactbits.dev) — GlassSurface, adapted for Alex Media.
// Kept: an SVG displacement filter applied as `backdrop-filter`, three channel
// passes for dispersion, engine detection with a frosted fallback.
// Changed: the map is an inverse-lens field generated on canvas (see lensMap.ts)
// with a measured scale, so only the bezel bends and the centre stays readable;
// dispersion is a scale difference between channels, so it shows on the rim only;
// tint and edge light come from the Alex Media tokens and the scene's key light;
// the root is a motion element so it can materialise on a spring; a `light` tone
// for a lens that lies on black acrylic, where a dark tint would disappear.
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { motion, type MotionStyle } from 'motion/react';
import { createLensMap } from './lensMap';
import './GlassSurface.css';

export interface GlassSurfaceProps {
  children?: ReactNode;
  borderRadius?: number;
  /** Share of the measured displacement to apply. */
  strength?: number;
  magnify?: number;
  bezelRatio?: number;
  /** Scale difference between the red and blue passes. */
  dispersion?: number;
  /** `dark` over the lit scene, `light` over black acrylic. */
  tone?: 'dark' | 'light';
  /** For QA: use the frosted path even where refraction is available. */
  forceFallback?: boolean;
  className?: string;
  style?: MotionStyle;
}

const supportsBackdropUrl = (filterId: string) => {
  // WebKit and Gecko parse `backdrop-filter: url()` but do not render it.
  const ua = navigator.userAgent;
  if ((/Safari/.test(ua) && !/Chrome|Chromium/.test(ua)) || /Firefox/.test(ua)) return false;
  const probe = document.createElement('div');
  probe.style.backdropFilter = `url(#${filterId})`;
  return probe.style.backdropFilter !== '';
};

const GlassSurface = ({
  children,
  borderRadius = 22,
  strength = 1.2,
  magnify = 1.15,
  bezelRatio = 0.62,
  dispersion = 0.07,
  tone = 'dark',
  forceFallback = false,
  className = '',
  style
}: GlassSurfaceProps) => {
  const filterId = `glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [refracts, setRefracts] = useState(false);
  const [ready, setReady] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<SVGFEImageElement>(null);
  const passRefs = useRef<(SVGFEDisplacementMapElement | null)[]>([]);

  useEffect(() => {
    setRefracts(!forceFallback && supportsBackdropUrl(filterId));
  }, [filterId, forceFallback]);

  // The map depends on shape only; it is regenerated on resize, never on movement.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !refracts) return;

    const sync = () => {
      const map = createLensMap({
        width: root.offsetWidth,
        height: root.offsetHeight,
        radius: borderRadius,
        bezelRatio,
        magnify
      });
      if (!map) return;
      const image = imageRef.current;
      image?.setAttribute('href', map.url);
      // In pixels, not percent: under `backdrop-filter` a percentage here does not
      // resolve against the element, the map comes out empty and the whole backdrop
      // is shifted by half the scale instead of being bent at the rim.
      image?.setAttribute('width', String(root.offsetWidth));
      image?.setAttribute('height', String(root.offsetHeight));
      const scale = map.scale * strength;
      [1 + dispersion, 1, 1 - dispersion].forEach((mul, i) => {
        passRefs.current[i]?.setAttribute('scale', (scale * mul).toFixed(2));
      });
      setReady(true);
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    return () => observer.disconnect();
  }, [refracts, borderRadius, bezelRatio, magnify, strength, dispersion]);

  const mode = refracts && ready ? 'glass-surface--svg' : 'glass-surface--fallback';
  const channel = (values: string) => `${values} 0 0 0 1 0`;

  return (
    <motion.div
      ref={rootRef}
      className={`glass-surface ${mode}${tone === 'light' ? ' glass-surface--light' : ''} ${className}`.trim()}
      style={{ borderRadius, '--glass-filter': `url(#${filterId})`, ...style } as MotionStyle}
    >
      <svg className="glass-surface__filter" aria-hidden="true">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage ref={imageRef} x="0" y="0" preserveAspectRatio="none" result="map" />
            {(['1 0 0 0 0 0 0 0 0 0 0 0 0 0 0', '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0', '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0'] as const).map(
              (matrix, i) => (
                <Fragment key={i}>
                  <feDisplacementMap
                    ref={(node) => {
                      passRefs.current[i] = node;
                    }}
                    in="SourceGraphic"
                    in2="map"
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result={`bent${i}`}
                  />
                  <feColorMatrix in={`bent${i}`} type="matrix" values={channel(matrix)} result={`ch${i}`} />
                </Fragment>
              )
            )}
            <feBlend in="ch0" in2="ch1" mode="screen" result="rg" />
            <feBlend in="rg" in2="ch2" mode="screen" />
          </filter>
        </defs>
      </svg>
      <div className="glass-surface__content">{children}</div>
    </motion.div>
  );
};

export default GlassSurface;
