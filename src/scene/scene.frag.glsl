#version 300 es
precision highp float;

// One scene, drawn in page space: graphite field → acrylic form → glass.
// The glass refracts the same scene function it sits on, so nothing is faked with a copy.

uniform vec2 uRes; // backing pixels
uniform float uScale; // backing pixels per CSS pixel
uniform vec2 uStage; // CSS pixels
uniform float uHeroH;
uniform float uSeamTop; // > 0: the field starts from the page tone over this many pixels

uniform sampler2D uForm; // premultiplied RGBA, mipmapped
uniform sampler2D uBevel; // RG tilt of the inflated silhouette, B height
uniform float uFormTexW;
uniform vec4 uFormRect; // x, y, w, h

uniform vec2 uLight; // key light, page space
uniform float uLightI; // 0 → 1 as the light comes on
uniform float uLime; // 0 → 1 as the lime wakes
uniform float uSweep; // entrance sweep position along the form

uniform vec4 uGRect[2]; // centre x, centre y, half width, half height
uniform vec4 uGShape[2]; // radius, bezel, refraction px, dispersion
uniform vec4 uGMat[2]; // blur lod, dim, saturation, opacity
uniform vec4 uGDepth[2]; // shadow offset, shadow blur, shadow alpha, sheen

out vec4 outColor;

const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
const vec3 G950 = vec3(0.047, 0.051, 0.055);
const vec3 G900 = vec3(0.075, 0.078, 0.082);
const vec3 G800 = vec3(0.102, 0.106, 0.114);
const vec3 G700 = vec3(0.141, 0.149, 0.157);
const vec3 G600 = vec3(0.176, 0.184, 0.196);
const float IOR = 1.5;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}

float blob(vec2 p, vec2 c, vec2 r) {
  vec2 d = (p - c) / r;
  return exp(-dot(d, d));
}

// Graphite field. Zones are placed in widths so they keep their shape on any screen.
vec3 field(vec2 P) {
  float W = uStage.x;
  vec2 q = P / W;
  float hy = uHeroH / W;
  vec2 lq = uLight / W;

  vec3 col = G800;

  // lit zone travels with the key light
  float lit = blob(q, lq + vec2(0.04, 0.05 * hy), vec2(0.44, 0.36 * hy));
  col = mix(col, G600, lit * (0.2 + 0.62 * uLightI));

  // a colder lift on the far side, so the field is not one gradient
  float lift = blob(q, vec2(0.80, 0.26 * hy), vec2(0.26, 0.34 * hy));
  col = mix(col, vec3(0.122, 0.129, 0.141), lift * 0.42);

  // deep zones
  float deep = blob(q, vec2(1.04, 0.92 * hy), vec2(0.44, 0.46 * hy)) + 0.8 * blob(q, vec2(-0.08, 0.70 * hy), vec2(0.30, 0.36 * hy));
  col = mix(col, G950, clamp(deep, 0.0, 1.0) * 0.78);

  // second act: the field lifts again behind the slab, then settles to the page tone
  float act = blob(q, vec2(0.34, 1.52 * hy), vec2(0.56, 0.46 * hy));
  col = mix(col, G700, act * 0.34);
  float deep2 = blob(q, vec2(0.96, 1.86 * hy), vec2(0.5, 0.44 * hy));
  col = mix(col, G950, deep2 * 0.6);

  // lime bounce: the form lights the graphite around it
  vec2 fc = uFormRect.xy + uFormRect.zw * vec2(0.5, 0.56);
  float bounce = blob(P, fc, uFormRect.zw * vec2(0.50, 0.60));
  col += vec3(0.56, 0.68, 0.02) * bounce * 0.07 * uLime;

  // brushed grain of the material: fine streaks along the vertical, uneven in strength
  float fine = vnoise(vec2(P.x * 0.46, P.y * 0.006)) - 0.5;
  float wide = vnoise(vec2(P.x * 0.09, P.y * 0.003)) - 0.5;
  float patchy = 0.35 + 0.65 * vnoise(P * 0.004 + 7.0);
  col += (fine * 0.007 * patchy + wide * 0.006);

  // seams with the page above and below
  col = mix(col, G900, smoothstep(uStage.y - 320.0, uStage.y - 8.0, P.y));
  if (uSeamTop > 0.0) col = mix(G900, col, smoothstep(0.0, uSeamTop, P.y));
  return col;
}

// The acrylic form: the brand render, relit by the scene's one light.
// Returns premultiplied colour and coverage, so several taps can be averaged.
vec4 formLit(vec2 P, float lod) {
  vec2 uv = (P - uFormRect.xy) / uFormRect.zw;
  if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) return vec4(0.0);

  vec4 t = textureLod(uForm, uv, lod);
  if (t.a < 0.004) return vec4(0.0);
  vec3 c = t.rgb / t.a;
  float a = t.a;

  // the render is smaller than the screen on dense displays: keep the silhouette crisp
  float density = uFormTexW / (uFormRect.z * uScale);
  if (lod < 0.5 && density < 1.0) a = clamp((a - 0.5) / density + 0.5, 0.0, 1.0);

  // the form never meets the edge of a stage: in a closing scene it sinks into the
  // graphite over a long tail; in the opening one this only guards the last pixels
  float sink = uSeamTop > 0.0 ? 300.0 : 96.0;
  a *= 1.0 - smoothstep(uStage.y - sink, uStage.y - sink * 0.1, P.y);

  float luma = dot(c, LUM);
  float lime = smoothstep(0.10, 0.34, min(c.r, c.g) - c.b);

  // entrance: the form is a silhouette until the sweep has crossed it
  float along = uv.x + (uv.y - 0.5) * 0.30;
  float passed = smoothstep(-0.02, 0.32, uSweep - along);
  c *= mix(0.085, 1.0, passed) * mix(1.0, mix(0.30, 1.0, uLime), lime);

  float band = exp(-pow((along - uSweep) / 0.09, 2.0));
  c += (c * 1.5 + 0.04) * band * (0.3 + 1.7 * pow(luma, 1.6));

  // key light: highlights open up where it is close
  vec2 ld = (P - uLight) / (uFormRect.zw * vec2(0.40, 0.95));
  float near = exp(-dot(ld, ld));
  c *= 1.0 + uLightI * near * (0.06 + 0.5 * smoothstep(0.35, 0.95, luma));

  // rim light from the inflated silhouette, facing the light
  if (lod < 1.0) {
    vec2 n = textureLod(uBevel, uv, 0.0).rg * 2.0 - 1.0;
    float tilt = length(n);
    float facing = max(dot(n / max(tilt, 1e-3), normalize(uLight - P + 1e-3)), 0.0);
    float rim = smoothstep(0.30, 0.92, tilt) * pow(facing, 2.4);
    c += mix(vec3(0.86, 0.92, 1.0), vec3(0.92, 1.0, 0.42), lime) * rim * 0.20 * uLightI * passed;
  }

  return vec4(c * a, a);
}

// The field with the form's soft ambient shadow on it, so the form sits in the space.
vec3 ground(vec2 P) {
  vec3 bg = field(P);
  vec2 suv = (P - uFormRect.xy) / uFormRect.zw - vec2(0.0, 0.035);
  if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
    bg *= 1.0 - 0.42 * textureLod(uForm, suv, 5.5).a;
  }
  return bg;
}

vec3 scene(vec2 P) {
  vec4 f = formLit(P, 0.0);
  return ground(P) * (1.0 - f.a) + f.rgb;
}

// The scene seen through thick glass. A single mip level magnified to the screen
// shows its texels as squares, so the blur is a disc of taps over a finer level;
// the disc is turned per pixel, which leaves fine grain instead of any pattern.
const int TAPS = 12;
vec3 sceneSoft(vec2 P, float lod) {
  if (lod < 0.6) return scene(P);
  float radius = 0.95 * exp2(lod) * uFormRect.z / uFormTexW;
  float fine = max(lod - 1.6, 0.0);
  float turn = hash12(gl_FragCoord.xy) * 6.2832;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < TAPS; i++) {
    float k = (float(i) + 0.5) / float(TAPS);
    float ang = turn + float(i) * 2.39996;
    acc += formLit(P + vec2(cos(ang), sin(ang)) * sqrt(k) * radius, fine);
  }
  acc /= float(TAPS);
  // the field is smooth already: one sample of it is enough
  return ground(P) * (1.0 - acc.a) + acc.rgb;
}

float sdBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec2 boxNormal(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  vec2 s = sign(p);
  if (q.x > 0.0 && q.y > 0.0) return normalize(q) * s;
  return q.x > q.y ? vec2(s.x, 0.0) : vec2(0.0, s.y);
}

// How far a ray bends at depth s into the bezel (0 rim → 1 flat top), for a
// convex squircle edge: surface slope → Snell → lateral offset, normalised to 1.
float lensBend(float s) {
  const float k = 3.2;
  float u = clamp(1.0 - s, 0.0, 1.0);
  float uk = pow(u, k);
  float slope = min(pow(u, k - 1.0) * pow(max(1.0 - uk, 1e-4), 1.0 / k - 1.0), 5.0);
  float th = atan(slope * 1.15);
  return tan(th - asin(sin(th) / IOR)) / 0.811;
}

void main() {
  vec2 P = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  vec3 col = scene(P);

  for (int i = 0; i < 2; i++) {
    float op = uGMat[i].w;
    if (op < 0.004) continue;

    vec2 b = uGRect[i].zw;
    vec2 p = P - uGRect[i].xy;
    float r = min(uGShape[i].x, min(b.x, b.y));
    float d = sdBox(p, b, r);
    float cover = clamp(0.5 - d * uScale, 0.0, 1.0);

    // elevation: a soft shadow under the glass
    float ds = sdBox(p - vec2(0.0, uGDepth[i].x), b, r);
    float shadow = (1.0 - smoothstep(-uGDepth[i].y * 0.4, uGDepth[i].y, ds)) * uGDepth[i].z * op;
    col *= 1.0 - shadow * (1.0 - cover);

    if (cover <= 0.0) continue;

    vec2 n = boxNormal(p, b, r);
    float bezel = uGShape[i].y;
    float bend = lensBend(clamp(-d / bezel, 0.0, 1.0)) * uGShape[i].z;
    vec2 off = -n * bend; // a convex rim samples from further inside
    float lod = uGMat[i].x;

    // dispersion lives where the bend is: on the rim only
    float spread = uGShape[i].w * step(0.5, bend * uGShape[i].w);
    vec3 g;
    if (spread > 0.0) {
      g.r = sceneSoft(P + off * (1.0 + spread), lod).r;
      g.g = sceneSoft(P + off, lod).g;
      g.b = sceneSoft(P + off * (1.0 - spread), lod).b;
    } else {
      g = sceneSoft(P + off, lod);
    }

    // body: saturation lets the colour glow through; the centre is dimmed for text, the rim stays clear
    g = mix(vec3(dot(g, LUM)), g, uGMat[i].z) * 1.05;
    float inner = smoothstep(0.0, bezel * 0.9, -d);
    float dim = uGMat[i].y * mix(0.34, 1.0, inner);
    g = g * (1.0 - dim) + vec3(0.050, 0.054, 0.060) * dim * 0.55;

    // quiet top sheen
    float ty = clamp((p.y + b.y) / (2.0 * b.y), 0.0, 1.0);
    g += uGDepth[i].w * (1.0 - ty) * (1.0 - ty);

    // edge light from the key light: bright where the rim faces it, a dim return on the far side
    float f = dot(n, normalize(uLight - P + 1e-3));
    float shade = 0.15 + 0.85 * pow(max(f, 0.0), 1.4) + 0.32 * pow(max(-f, 0.0), 2.0);
    float line = exp(-pow((-d - 1.0) / 0.95, 2.0));
    float glow = exp(d / 7.0);
    g += (line * 0.60 + glow * 0.065) * shade * (0.35 + 0.65 * uLightI);
    // a darker seam just inside reads as thickness
    g *= 1.0 - 0.16 * exp(-pow((-d - 3.4) / 1.5, 2.0));

    col = mix(col, g, cover * op);
  }

  col += (hash12(gl_FragCoord.xy) - 0.5) * 0.022;
  outColor = vec4(col, 1.0);
}
