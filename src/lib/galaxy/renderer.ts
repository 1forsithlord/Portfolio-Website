import { clamp, planetPos, seededRandom, smooth01, toView } from "./math";
import {
  galaxyFragment,
  galaxyVertex,
  planetFragment,
  planetVertex,
  starFragment,
  starVertex,
} from "./shaders";
import type { Camera, FrameState, GalaxyRenderer, RendererOptions } from "./types";

/** Matches the page background (--color-bg) as linear 0 to 1 channels. */
const CLEAR: readonly [number, number, number] = [0.024, 0.02, 0.05];

export function createGalaxyRenderer(
  container: HTMLElement,
  options: RendererOptions,
): GalaxyRenderer | null {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "display:block;width:100%;height:100%";

  let ctx: WebGLRenderingContext | null = null;
  try {
    ctx = canvas.getContext("webgl", { antialias: false, alpha: false });
  } catch {
    ctx = null;
  }
  if (!ctx) return null;
  const gl: WebGLRenderingContext = ctx;

  const { particles: PARTICLES, stars: STARS, dpr: DPR, onContextLost, onContextRestored } = options;
  let contextLost = false;

  const uniformCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const U = (program: WebGLProgram, name: string): WebGLUniformLocation | null => {
    let perProgram = uniformCache.get(program);
    if (!perProgram) {
      perProgram = new Map();
      uniformCache.set(program, perProgram);
    }
    if (!perProgram.has(name)) perProgram.set(name, gl.getUniformLocation(program, name));
    return perProgram.get(name) ?? null;
  };

  function compile(type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("galaxy shader failed:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function program(
    vertexSource: string,
    fragmentSource: string,
    attribs: Record<string, number>,
  ): WebGLProgram | null {
    const vs = compile(gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const p = gl.createProgram();
    if (!vs || !fs || !p) return null;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    for (const [name, index] of Object.entries(attribs)) gl.bindAttribLocation(p, index, name);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn("galaxy program failed:", gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  const starsProgram = program(starVertex, starFragment, { s: 0 });
  const galaxyProgram = program(galaxyVertex, galaxyFragment, { a: 0, h: 1 });
  const planetProgram = program(planetVertex, planetFragment, { corner: 0 });
  if (!starsProgram || !galaxyProgram || !planetProgram) return null;
  
  const pStars: WebGLProgram = starsProgram;
  const pGal: WebGLProgram = galaxyProgram;
  const pPlan: WebGLProgram = planetProgram;

  const random = seededRandom(20241015);
  const gauss = () => (random() + random() + random() - 1.5) / 1.5;

  const galData = new Float32Array(PARTICLES * 5);
  for (let i = 0; i < PARTICLES; i++) {
    const o = i * 5;
    galData[o] = Math.pow(random(), 0.8);
    galData[o + 1] = random() < 0.12 ? (random() * 2 - 1) * 3.5 : gauss();
    galData[o + 2] = gauss();
    // CHANGED: 4 arms instead of 2
    galData[o + 3] = i % 4; 
    galData[o + 4] = gauss();
  }
  const galBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, galBuf);
  gl.bufferData(gl.ARRAY_BUFFER, galData, gl.STATIC_DRAW);

  const starData = new Float32Array(STARS * 4);
  for (let i = 0; i < STARS; i++) {
    const z = random() * 2 - 1;
    const ph = random() * Math.PI * 2;
    const rxy = Math.sqrt(1 - z * z);
    starData[i * 4] = rxy * Math.cos(ph);
    starData[i * 4 + 1] = z;
    starData[i * 4 + 2] = rxy * Math.sin(ph);
    starData[i * 4 + 3] = random();
  }
  const starBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  container.appendChild(canvas);

  const onLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    onContextLost?.();
  };
  const onRestored = () => {
    onContextRestored?.();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  function resize(): boolean {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return false;
    const W = Math.round(w * DPR);
    const H = Math.round(h * DPR);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
      gl.viewport(0, 0, W, H);
    }
    return true;
  }

  function setCamera(p: WebGLProgram, cam: Camera, aspect: number): void {
    gl.uniform1f(U(p, "yaw"), cam.yaw);
    gl.uniform1f(U(p, "pitch"), cam.pitch);
    gl.uniform1f(U(p, "aspect"), aspect);
    gl.uniform1f(U(p, "shiftX"), cam.sx);
    gl.uniform1f(U(p, "shiftY"), cam.sy);
  }

  function draw(state: FrameState): void {
    if (contextLost) return;
    const cam = state.cam;
    const aspect = canvas.width / Math.max(canvas.height, 1);

    gl.clearColor(CLEAR[0], CLEAR[1], CLEAR[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(pStars);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    setCamera(pStars, cam, aspect);
    gl.uniform1f(U(pStars, "t"), state.tTwinkle);
    gl.uniform1f(U(pStars, "amt"), cam.stars);
    gl.uniform1f(U(pStars, "dpr"), DPR);
    gl.drawArrays(gl.POINTS, 0, STARS);

    gl.useProgram(pGal);
    gl.bindBuffer(gl.ARRAY_BUFFER, galBuf);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 20, 16);
    setCamera(pGal, cam, aspect);
    gl.uniform1f(U(pGal, "t"), state.tRotate);
    gl.uniform1f(U(pGal, "dist"), cam.dist);
    gl.uniform1f(U(pGal, "dpr"), DPR);
    gl.uniform1f(U(pGal, "open"), cam.open);
    gl.uniform3f(U(pGal, "target"), cam.tx, cam.ty, cam.tz);
    gl.uniform3f(U(pGal, "tint"), state.tint[0], state.tint[1], state.tint[2]);
    gl.uniform1f(U(pGal, "tintAmt"), state.tintAmt);
    gl.drawArrays(gl.POINTS, 0, Math.min(PARTICLES, state.count));

    if (state.pAmt > 0.01 && state.planets.length > 0) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pPlan);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(0);
      gl.disableVertexAttribArray(1);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      setCamera(pPlan, cam, aspect);
      gl.uniform1f(U(pPlan, "dist"), cam.dist);
      gl.uniform3f(U(pPlan, "target"), cam.tx, cam.ty, cam.tz);
      const zoomF = clamp((3.2 - cam.dist) / 1.6, 0, 1);

      const origin = toView([0, 0, 0], cam);
      const list = state.planets
        .map((planet) => {
          const pos = planetPos(planet, state.tRotate);
          return { planet, pos, v: toView(pos, cam) };
        })
        .sort((x, y) => y.v[2] - x.v[2]);

      for (const { planet, pos, v } of list) {
        const pal = planet.palette;
        const cx = origin[0] - v[0];
        const cy = origin[1] - v[1];
        const cz = -(origin[2] - v[2]);
        const cn = Math.hypot(cx, cy, cz) || 1;
        const lx = -0.5 + (cx / cn) * 0.45;
        const ly = 0.55 + (cy / cn) * 0.45;
        const lz = 0.7 + (cz / cn) * 0.45;
        const fn = Math.hypot(lx, ly, lz) || 1;
        const dT = Math.hypot(pos[0] - cam.tx, pos[1] - cam.ty, pos[2] - cam.tz);
        const mul = 1 - zoomF * (1 - smooth01(1 - dT / 0.5)) * 0.82;

        gl.uniform1f(U(pPlan, "appear"), state.pAmt * mul);
        gl.uniform3f(U(pPlan, "pos"), pos[0], pos[1], pos[2]);
        gl.uniform1f(U(pPlan, "rad"), planet.size * (0.5 + 0.5 * state.pAmt));
        gl.uniform1f(U(pPlan, "scale"), planet.ring ? 2.4 : 1.6);
        gl.uniform3f(U(pPlan, "colA"), pal.rgbA[0], pal.rgbA[1], pal.rgbA[2]);
        gl.uniform3f(U(pPlan, "colB"), pal.rgbB[0], pal.rgbB[1], pal.rgbB[2]);
        gl.uniform3f(U(pPlan, "atmo"), pal.rgbAtmo[0], pal.rgbAtmo[1], pal.rgbAtmo[2]);
        gl.uniform3f(U(pPlan, "L"), lx / fn, ly / fn, lz / fn);
        gl.uniform1f(U(pPlan, "ring"), planet.ring ? 1 : 0);
        gl.uniform1f(U(pPlan, "ringTilt"), 0.32);
        gl.uniform1f(U(pPlan, "ringRot"), planet.ringRot);
        gl.uniform1f(U(pPlan, "style"), pal.style);
        gl.uniform1f(U(pPlan, "seed"), planet.seed);
        gl.uniform1f(U(pPlan, "spin"), state.tRotate * 0.12 + planet.seed);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
  }

  function dispose(): void {
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    if (!contextLost) {
      gl.deleteBuffer(galBuf);
      gl.deleteBuffer(starBuf);
      gl.deleteBuffer(quadBuf);
      gl.deleteProgram(pStars);
      gl.deleteProgram(pGal);
      gl.deleteProgram(pPlan);
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  }

  resize();

  return {
    particles: PARTICLES,
    get contextLost() {
      return contextLost;
    },
    resize,
    draw,
    dispose,
  };
}