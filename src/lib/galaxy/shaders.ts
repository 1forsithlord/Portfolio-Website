/*
  GLSL ES 1.00 shader sources, ported from the previous site without changes
  to the maths. The galaxy is additive points; planets are lit spheres drawn on
  a quad.
*/

const camGlsl = `
    vec3 viewSpace(vec3 p, vec3 target, float yaw, float pitch){
      p -= target;
      float cy = cos(yaw), sy = sin(yaw);
      p.xz = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy);
      float cp = cos(pitch), sp = sin(pitch);
      p.yz = vec2(p.y * cp - p.z * sp, p.y * sp + p.z * cp);
      return p;
    }`;

export const starVertex = `
    attribute vec4 s;
    uniform float yaw, pitch, aspect, t, amt, dpr, shiftX, shiftY;
    varying vec3 col;
    void main(){
      vec3 p = s.xyz;
      float cy = cos(yaw), sy = sin(yaw);
      p.xz = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy);
      float cp = cos(pitch), sp = sin(pitch);
      p.yz = vec2(p.y * cp - p.z * sp, p.y * sp + p.z * cp);
      if (p.z < 0.2) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; col = vec3(0.0); return; }
      vec2 sc = p.xy / p.z * 0.95;
      sc.x = sc.x / aspect + shiftX * 0.35;
      sc.y += shiftY * 0.35;
      gl_Position = vec4(sc, 0.0, 1.0);
      float r = s.w;
      float tw = 0.65 + 0.35 * sin(t * (0.6 + r * 2.0) + r * 40.0);
      gl_PointSize = (0.8 + r * r * 2.4) * dpr * (0.8 + 0.4 * tw);
      vec3 c = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.84, 0.74), fract(r * 7.3));
      c = mix(c, vec3(1.0, 0.70, 0.90), step(0.93, fract(r * 13.7)) * 0.7);
      col = c * tw * amt * (0.30 + 0.70 * r);
    }`;

export const starFragment = `precision mediump float; varying vec3 col;
    void main(){ float f = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(col * f, 1.0); }`;

export const galaxyVertex = `
    attribute vec4 a;      // x radius, y arm scatter, z radial jitter, w arm index
    attribute float h;     // vertical scatter
    uniform float t, aspect, dist, dpr, shiftX, shiftY, yaw, pitch, open, tintAmt;
    uniform vec3 tint, target;
    varying vec3 col;
    ${camGlsl}
    void main(){
      float r  = a.x;
      
      // CHANGED: mix(0.45, 1.0, open) prevents the galaxy from crushing into a white blob when closed
      float rr = pow(r, 1.15) * 1.7 * mix(0.45, 1.0, open);          
      
      float spread = 0.10 + 1.0 * pow(r, 1.3);
      float omega  = 0.28 / (0.35 + rr);
      
      // CHANGED: 4 arms (1.57 offset instead of 3.14) and longer wind (4.8 instead of 2.6)
      float ang = a.w * 1.570796 + rr * 4.8 + a.y * spread - t * omega;
      
      float rad = rr + a.z * (0.015 + 0.09 * r);
      float thick = (0.01 + 0.07 * r) * (1.0 + 2.5 * pow(abs(h), 4.0));
      vec3 p = viewSpace(vec3(cos(ang) * rad, h * thick, sin(ang) * rad), target, yaw, pitch);

      float d = dist + p.z;
      if (d < 0.3) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; col = vec3(0.0); return; }
      vec2 s = p.xy / d * 2.9;
      s.x = s.x / aspect + shiftX;
      s.y += shiftY;
      gl_Position = vec4(s, 0.0, 1.0);

      float rnd = fract(a.z * 91.7 + h * 13.1);
      gl_PointSize = clamp((1.0 + 1.2 * rnd) * (5.5 / d) * dpr, 1.0, 5.0 * dpr);

      vec3 core  = vec3(1.00, 0.86, 0.68);
      vec3 mid   = vec3(1.00, 0.42, 0.55);
      vec3 outer = vec3(0.58, 0.36, 0.98);
      vec3 rim   = vec3(0.30, 0.42, 1.00);
      vec3 c = mix(core, mid, smoothstep(0.0, 0.30, r));
      c = mix(c, outer, smoothstep(0.35, 0.80, r));
      c = mix(c, rim,   smoothstep(0.75, 1.00, r));
      float ridge = 1.0 - smoothstep(0.0, 0.9, abs(a.y));
      
      // Slightly reduced brightness to prevent over-blowing the center
      col = c * mix(0.30, 1.0, ridge) * mix(1.15, 0.5, r) * 0.8;
      
      float lum = dot(col, vec3(0.34));
      col = mix(col, tint * lum * 2.4, tintAmt);
    }`;

export const galaxyFragment = `precision mediump float; varying vec3 col;
    void main(){ float f = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(col * f * 0.85, 1.0); }`;

export const planetVertex = `
    attribute vec2 corner;
    uniform vec3 pos, target;
    uniform float rad, scale, yaw, pitch, dist, aspect, shiftX, shiftY;
    varying vec2 vUv;
    ${camGlsl}
    void main(){
      vec3 p = viewSpace(pos, target, yaw, pitch);
      float d = dist + p.z;
      vUv = corner;
      if (d < 0.25) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vec2 c = (p.xy + corner * rad * scale) / d * 2.9;
      gl_Position = vec4(c.x / aspect + shiftX, c.y + shiftY, 0.0, 1.0);
    }`;

export const planetFragment = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 vUv;
    uniform vec3 colA, colB, atmo, L;
    uniform float scale, ring, ringTilt, ringRot, style, seed, spin, appear;

    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
      return v;
    }
    vec4 over(vec4 s, vec4 d){ return s + d * (1.0 - s.a); }

    void main(){
      vec2 p = vUv * scale;
      float r = length(p);

      float cr = cos(ringRot), sr = sin(ringRot);
      vec2 q = vec2(cr * p.x + sr * p.y, -sr * p.x + cr * p.y);
      float rr = length(vec2(q.x, q.y / ringTilt));
      float rmask = ring * smoothstep(1.32, 1.40, rr) * (1.0 - smoothstep(2.0, 2.08, rr));
      float rb = (0.55 + 0.45 * sin(rr * 46.0 + seed)) * (0.65 + 0.35 * noise(vec2(rr * 18.0, seed)));
      float gap = 1.0 - smoothstep(0.0, 0.02, abs(rr - 1.72) - 0.025);
      float ra = rmask * (0.30 + 0.55 * rb) * (1.0 - 0.8 * gap);
      vec3 rc = mix(colA, vec3(1.0), 0.45) * (0.5 + 0.7 * rb);
      vec4 ringCol = vec4(rc * ra, ra);

      vec4 sph = vec4(0.0);
      if (r < 1.0) {
        vec3 n = vec3(p, sqrt(1.0 - r * r));
        float lon = atan(n.x, n.z) + spin;
        vec2 uv = vec2(lon * 1.15, n.y * 2.0);
        float t;
        if (style < 0.5) {
          t = 0.5 + 0.5 * sin(n.y * 10.0 + fbm(uv * vec2(0.8, 3.5) + seed) * 3.2 + seed);
        } else if (style < 1.5) {
          vec2 w = vec2(fbm(uv * 1.8 + seed), fbm(uv * 1.8 + vec2(5.2, 1.3) + seed));
          t = fbm(uv * 2.0 + 2.4 * w);
        } else if (style < 2.5) {
          t = clamp(0.5 + 0.35 * sin(n.y * 6.0 + fbm(uv * 1.4 + seed) * 2.0) + 0.3 * (fbm(uv * 4.0) - 0.5), 0.0, 1.0);
        } else {
          t = smoothstep(0.28, 0.78, fbm(uv * 3.0 + seed));
        }
        vec3 base = mix(colB, colA, clamp(t, 0.0, 1.0));
        float ndl  = dot(n, L);
        float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
        vec3 lit = base * (0.24 + 0.80 * wrap * wrap + 0.14 * wrap);
        float fres = pow(1.0 - n.z, 3.0);
        lit += atmo * fres * (0.25 + 0.90 * wrap);
        lit += vec3(1.0) * pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0) * 0.12;
        float edge = 1.0 - smoothstep(0.992, 1.0, r);
        sph = vec4(lit * edge, edge);
      }

      float halo = smoothstep(0.96, 1.0, r) * exp(-(max(r, 1.0) - 1.0) * 6.5) * 0.55;
      vec4 res = vec4(atmo * halo * 0.8, halo * 0.5);
      if (q.y < 0.0)  res = over(ringCol, res);
      res = over(sph, res);
      if (q.y >= 0.0) res = over(ringCol, res);
      gl_FragColor = res * appear;
    }`;
