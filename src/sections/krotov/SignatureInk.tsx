import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SIG_FILL, SIG_SDF_SCALE, SIG_TMAX, SIG_VIEWBOX } from './signature'
import inkUrl from './signature-ink.png'

/*
 * Taken from the CarsCity proposal (КП карсити/presentation/src/components/SignatureInk.tsx), where it
 * signs the top-right corner of every slide. Kept: the renderer, the ink texture, the timing, the
 * fallbacks. Changed: imports are local; `?still` of the deck is replaced by the `still` prop.
 *
 * The Krotov Work signature writing itself — the same renderer as in GIRIN × ROMAN.
 *
 * Everything runs on the GPU. One texture holds the ink (signed distance to its edge, R) and the
 * moment the pen reaches every texel (G<<8|B); per frame the CPU only sends the clock. Behind the
 * nib the ink is hot and cools into the brand red.
 *
 * WebGL lives only while the pen moves. Once the ink has cooled, the canvas is hidden and the
 * same signature stays as a still vector fill: an idle WebGL layer still costs Safari frames.
 *
 * The signature never goes missing: a timer (not the frame loop, which a browser may throttle or
 * stop) brings the vector fill back once the pen should be done, whatever happened to WebGL
 * meanwhile (ink not loaded, context lost, frames not drawn).
 */

const VB = SIG_VIEWBOX.split(' ').map(Number)
export const SIG_ASPECT = VB[2] / VB[3]
/** pen speed against the recorded timing: below 1 writes slower (Рома, 2026-11-28: «чуть медленнее») */
const PACE = 0.68
/** seconds the pen takes on screen */
const WRITE = SIG_TMAX / PACE
/** seconds the ink stays hot behind the nib */
const COOL = 1
/** the ink at rest: the brand red */
const INK = [0xd7, 0x19, 0x1f].map((c) => c / 255)
/** the nib: the same red, lit */
const HOT = [0xff, 0x6a, 0x58].map((c) => c / 255)

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos.x * 2.0 - 1.0, 1.0 - aPos.y * 2.0, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSdf;
uniform sampler2D uTime;
uniform float uNow, uCool, uTmax, uScale;
uniform vec3 uInk, uHot;
out vec4 outColor;
void main() {
  float d = (texture(uSdf, vUv).r * 255.0 - 128.0) / uScale;
  float a = clamp(d / max(fwidth(d), 1e-4) + 0.5, 0.0, 1.0);
  if (a <= 0.0) discard;
  vec3 tt = texture(uTime, vUv).rgb;
  float code = floor(tt.g * 255.0 + 0.5) * 256.0 + floor(tt.b * 255.0 + 0.5);
  if (code > 65534.5) discard;
  float age = uNow - code / 65534.0 * uTmax;
  float rev = clamp(age / 0.035, 0.0, 1.0);
  if (rev <= 0.0) discard;
  float hot = 1.0 - smoothstep(0.1 * uCool, uCool, age);
  vec3 col = mix(uInk, uHot, hot * 0.92);
  float alpha = a * rev;
  outColor = vec4(col * alpha, alpha);
}`

function compile(gl: WebGL2RenderingContext) {
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
  return prog
}

export type SignaturePen = {
  /** write the signature from the first stroke, after `delay` seconds */
  write: (delay?: number) => void
  /** the signature as written (no animation) */
  show: () => void
  /** blank again, ready to be written */
  reset: () => void
  /** set the renderer up now (context, shader, texture), so the first stroke costs nothing */
  warm: () => void
}

type Props = {
  className?: string
  style?: CSSProperties
  /** static red signature (print, or when the pen must not move) */
  still?: boolean
  onPen?: (pen: SignaturePen) => void
}

type Renderer = { draw: (seconds: number | null) => void; prime: () => void; fit: () => boolean; ready: () => boolean; dispose: () => void }

/** WebGL2 context, shader and ink texture on one canvas; `null` if WebGL2 is unavailable */
function createRenderer(cv: HTMLCanvasElement, onReady: () => void, onLost: () => void): Renderer | null {
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true })
  if (!gl) return null
  let prog: WebGLProgram
  try {
    prog = compile(gl)
  } catch (err) {
    console.error(err)
    return null
  }
  gl.useProgram(prog)
  const U = (n: string) => gl.getUniformLocation(prog, n)
  const uNow = U('uNow')
  gl.uniform1i(U('uSdf'), 0)
  gl.uniform1i(U('uTime'), 1)
  gl.uniform1f(U('uCool'), COOL)
  gl.uniform1f(U('uTmax'), SIG_TMAX)
  gl.uniform1f(U('uScale'), SIG_SDF_SCALE)
  gl.uniform3fv(U('uInk'), INK)
  gl.uniform3fv(U('uHot'), HOT)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  // one texture, sampled smooth for the ink edge and exact for the pen's timing
  const tex = gl.createTexture()
  const samplers = [gl.LINEAR, gl.NEAREST].map((f) => {
    const s = gl.createSampler()!
    gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, f)
    gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER, f)
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.samplerParameteri(s, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return s
  })
  let loaded = false
  let alive = true
  const img = new Image()
  img.src = inkUrl
  img.decode().then(() => {
    if (!alive || gl.isContextLost()) return
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    for (const unit of [0, 1]) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.bindSampler(unit, samplers[unit])
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gl.RGB, gl.UNSIGNED_BYTE, img)
    loaded = true
    onReady()
  }, () => {
    // the ink texture could not be decoded: the vector signature stays
    if (alive) onLost()
  })

  const lost = (e: Event) => {
    e.preventDefault()
    onLost()
  }
  cv.addEventListener('webglcontextlost', lost)

  return {
    ready: () => loaded,
    // the backing store follows the size the canvas really has on screen
    fit: () => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(r.width * dpr))
      const h = Math.max(1, Math.round(r.height * dpr))
      if (cv.width === w && cv.height === h) return false
      cv.width = w
      cv.height = h
      gl.viewport(0, 0, w, h)
      return true
    },
    draw: (seconds) => {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (seconds === null) return
      gl.uniform1f(uNow, seconds)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    // a full draw at a time before the first stroke: every fragment is discarded, nothing shows,
    // but the pipeline gets built now
    prime: () => {
      gl.uniform1f(uNow, -1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.flush()
    },
    dispose: () => {
      alive = false
      cv.removeEventListener('webglcontextlost', lost)
    },
  }
}

export function SignatureInk({ className = '', style, still: stillProp = false, onPen }: Props) {
  const still = stillProp
  const canvas = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLSpanElement>(null)
  const [fallback, setFallback] = useState(still)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    /** blank · writing (WebGL on screen) · done (the still vector signature) */
    const phase = (p: 'blank' | 'writing' | 'done') => {
      const el = box.current
      if (!el) return
      el.classList.toggle('is-writing', p === 'writing')
      el.classList.toggle('is-done', p === 'done')
    }
    let r: Renderer | null = null
    let failed = still
    let raf = 0
    /** brings the still signature back once the pen must have finished */
    let guard = 0
    /** pen clock origin (ms); NaN = blank */
    let start = NaN

    const frame = () => {
      raf = 0
      if (!r?.ready()) return
      const now = performance.now()
      r.draw(Number.isNaN(start) ? null : ((now - start) / 1000) * PACE)
      if (Number.isNaN(start)) return
      // the pen is still moving, or the ink is still cooling; then the still signature takes over
      if ((now - start) / 1000 < WRITE + COOL / PACE + 0.05) raf = requestAnimationFrame(frame)
      else pen.show()
    }
    /** the GPU builds the shader's pipeline on the first draw, not at link — and that stalls every
     *  frame on the page for a moment (≈0.6 s on a slow machine, measured). One invisible draw while
     *  the browser is idle pays that before the pen ever moves. */
    let primed = false
    const prime = () => {
      if (primed || !r?.ready()) return
      primed = true
      const go = () => {
        if (!r?.ready() || !Number.isNaN(start)) return
        r.fit()
        r.prime()
      }
      // well after the opening, and then only when the browser has nothing else to do
      setTimeout(() => (typeof requestIdleCallback === 'function' ? requestIdleCallback(go, { timeout: 4000 }) : go()), 3000)
    }
    const kick = () => {
      if (!r?.ready()) return
      prime()
      r.fit()
      if (!raf) raf = requestAnimationFrame(frame)
    }
    /** the renderer is built on first need (never during the opening) */
    const ensure = () => {
      if (r || failed || !canvas.current) return !failed
      r = createRenderer(canvas.current, kick, () => {
        failed = true
        setFallback(true)
        pen.show()
      })
      if (!r) {
        failed = true
        setFallback(true)
      }
      return !failed
    }

    const stop = () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(guard)
      raf = 0
      start = NaN
    }
    const pen: SignaturePen = {
      warm: () => void ensure(),
      write: (delay = 0) => {
        if (reduced || !ensure()) return pen.show()
        stop()
        start = performance.now() + delay * 1000
        phase('writing')
        kick()
        guard = window.setTimeout(pen.show, (delay + WRITE + COOL / PACE + 0.4) * 1000)
      },
      show: () => {
        stop()
        phase('done')
      },
      reset: () => {
        stop()
        phase('blank')
      },
    }
    onPen?.(pen)

    // while writing, the backing store follows the window size
    const onResize = () => {
      if (r?.ready() && !Number.isNaN(start) && r.fit()) kick()
    }
    window.addEventListener('resize', onResize)
    return () => {
      stop()
      window.removeEventListener('resize', onResize)
      r?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still])

  return (
    <span ref={box} className={`sig ${fallback ? 'is-done' : ''} ${className}`} style={{ aspectRatio: `${VB[2]} / ${VB[3]}`, ...style }} aria-hidden>
      {!fallback && <canvas ref={canvas} />}
      <svg viewBox={SIG_VIEWBOX}>
        <path d={SIG_FILL} fillRule="evenodd" fill="#d7191f" />
      </svg>
    </span>
  )
}
