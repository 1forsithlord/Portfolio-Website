/* =========================================================
   Anime.js v4
   ========================================================= */
import {
  animate,
  createTimeline,
  createTimer,
  stagger,
  utils,
  svg as svgUtils,
} from 'animejs';

/* =========================================================
   Config
   ========================================================= */
const GITHUB_USERNAME = "1forsithlord";
const REPO_COUNT = 6;
const CACHE_KEY = `gh_v2_${GITHUB_USERNAME}`;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Contact form: paste a Formspree / Getform / Web3Forms endpoint here to make it send real messages.
// e.g. "https://formspree.io/f/xxxxxxx"   (left empty, the form tells visitors it isn't connected yet)
const FORM_ENDPOINT = "";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let PROJECT_META = {};
let galaxy = null;          // API object set by initHeroGalaxy()
let transitioning = false; // true while the fly-through is playing

/* =========================================================
   Mobile nav
   ========================================================= */
const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");

navToggle.addEventListener("click", () => {
  const open = siteNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});

/* =========================================================
   Router
   ========================================================= */
const ROUTES = {
  "/":         "hero",
  "/projects": "projects",
  "/about":    "about",
  "/contact":  "contact",
};

function currentRoute() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw || raw === "/") return "/";
  return ROUTES[raw] ? raw : "/";
}

function navigate() {
  const route    = currentRoute();
  const targetId = ROUTES[route];
  const targetEl = document.getElementById(targetId);
  if (!targetEl) return;

  siteNav.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");

  document.querySelectorAll("main > section").forEach(sec => {
    sec.classList.toggle("is-active", sec.id === targetId);
  });

  document.querySelectorAll(".nav__links a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("data-route") === route);
  });

  document.body.dataset.route = route === "/" ? "home" : route.slice(1);
  transitioning = false;
  document.body.classList.remove("is-flying");
  if (galaxy) galaxy.setMode(route === "/" ? "hero" : "bg");

  window.scrollTo({ top: 0, behavior: "auto" });

  if (targetId === "hero") playHeroAnimation();
  if (targetId === "about") {
    requestAnimationFrame(() => { animateStats(); animateSkills(); });
  }
  if (targetId === "projects") {
    requestAnimationFrame(revealCardsIfActive);
  }
}

window.addEventListener("hashchange", navigate);

/** Go to a route ("/", "/projects", ...). Leaving Home plays the galaxy fly-through first. */
function goTo(route) {
  if (!ROUTES[route]) route = "/";
  const href = route === "/" ? "#/" : "#" + route;
  if (route === currentRoute()) return;
  const leavingHome = currentRoute() === "/";
  if (leavingHome && galaxy && !reduceMotion && !transitioning) {
    transitioning = true;
    document.body.classList.add("is-flying");
    galaxy.flyIn().then(() => { location.hash = href; });
  } else if (!transitioning) {
    location.hash = href;
  }
}

document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  goTo(a.getAttribute("href").slice(1) || "/");
});

/* =========================================================
   Hero entrance
   ========================================================= */
function prepareHeroChars() {
  const nameEl = document.getElementById("heroName");
  if (!nameEl || nameEl.dataset.split === "1") return;
  const text = nameEl.textContent.trim();
  // Words stay whole (nowrap); lines may only break at the spaces between them.
  nameEl.setAttribute("aria-label", text);
  nameEl.innerHTML = text.split(/\s+/)
    .map(word => `<span class="word" aria-hidden="true">${[...word].map(ch => `<span class="char">${ch}</span>`).join("")}</span>`)
    .join(" ");
  nameEl.dataset.split = "1";
}

function playHeroAnimation() {
  if (reduceMotion) return;

  utils.set("#heroName .char", { translateY: 40, opacity: 0 });
  utils.set(".hero__eyebrow, .hero__pitch, .hero__cta", { translateY: 16, opacity: 0 });

  createTimeline({ defaults: { ease: "outExpo" } })
    .add("#heroName .char", {
      translateY: [40, 0],
      opacity: [0, 1],
      delay: stagger(18),
      duration: 700,
    })
    .add(".hero__eyebrow, .hero__pitch, .hero__cta", {
      translateY: [16, 0],
      opacity: [0, 1],
      delay: stagger(80),
      duration: 600,
    }, "-=400");
}

/* =========================================================
   Home journey
   Scroll opens the galaxy, the camera flies through it, and every
   project is a planet with its own glass card.
   ========================================================= */
const clamp    = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const hexToRgb = hex => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};

const PLANET_PALETTES = [
  { a: "#ffb59e", b: "#ff6f9c", atmo: "#ffd2c2", style: 0, ring: false },   // coral gas giant
  { a: "#b9a8ff", b: "#5f4bff", atmo: "#cfc4ff", style: 1, ring: false },   // violet storm
  { a: "#8ff0e6", b: "#1fa7bf", atmo: "#c4fbf5", style: 2, ring: true  },   // lagoon, ringed
  { a: "#ff9fd6", b: "#a63fd0", atmo: "#ffc8ea", style: 0, ring: false },   // orchid bands
  { a: "#ffd9a0", b: "#ff935c", atmo: "#ffe9c9", style: 3, ring: true  },   // apricot rock, ringed
  { a: "#bdf7cf", b: "#3fbf94", atmo: "#dcffe8", style: 1, ring: false },   // mint swirl
].map(p => ({ ...p, rgbA: hexToRgb(p.a), rgbB: hexToRgb(p.b), rgbAtmo: hexToRgb(p.atmo) }));

/* Shown until GitHub answers (or if it can't be reached). */
const PROFILE_URL = `https://github.com/${GITHUB_USERNAME}`;
const FALLBACK_PROJECTS = [
  { name: "Zero-LoRA", language: null, stars: 0, forks: 0, homepage: null, html_url: PROFILE_URL, videoId: null,
    description: "My final-year project: continual learning for CLIP with per-task LoRA adapters that can be merged, so a vision-language model keeps learning new tasks without forgetting the old ones.",
    stack: ["CLIP", "LoRA", "Continual learning"] },
  { name: "FinSense", language: null, stars: 0, forks: 0, homepage: null, html_url: PROFILE_URL, videoId: null,
    description: "An AI-based expense tracker built as an academic project, exploring an end-to-end multi-model pipeline for multimodal expense intelligence.",
    stack: ["Multimodal", "Expense intelligence"] },
  { name: "SAARTHI", language: null, stars: 0, forks: 0, homepage: null, html_url: PROFILE_URL, videoId: null,
    description: "My Smart India Hackathon 2026 project: an AI/ML dead-reckoning navigation PWA that fuses phone sensors and GNSS through an adaptive UKF/EKF core, so navigation keeps working where GPS drops out.",
    stack: ["PWA", "UKF/EKF", "Sensor fusion"] },
  { name: "Pygame chess", language: "Python", stars: 0, forks: 0, homepage: null, html_url: PROFILE_URL, videoId: null,
    description: "A chess game written in Python and Pygame.",
    stack: ["Python", "Pygame"] },
  { name: "Water reminder", language: "Go", stars: 0, forks: 0, homepage: null, html_url: PROFILE_URL, videoId: null,
    description: "A Spider-Man-themed macOS water reminder in Go and Objective-C, forked from an open-source project and customised with a delay slider.",
    stack: ["Go", "Objective-C", "macOS"] },
];

const J = {
  projects: [], summary: null, planets: [], chapters: [], tl: [],
  S_ABOUT: 1.4, S_P0: 2.7, STEP: 1.0, S_OUT: 6,
  lastNearest: null,
};
const sPlanet = i => J.S_P0 + i * J.STEP;
const isWide  = () => window.innerWidth / window.innerHeight > 1.05;

/* Matched loosely on the repo name (letters/digits only), so "zero-lora", "ZeroLoRA" and "zero_lora_clip" all hit. */
const PROJECT_FACTS = [
  { keys: ["zerolora", "adapthub"], stack: ["CLIP", "LoRA", "Continual learning"],
    description: FALLBACK_PROJECTS[0].description },
  { keys: ["finsense"], stack: ["Multimodal", "Expense intelligence"],
    description: FALLBACK_PROJECTS[1].description },
  { keys: ["saarthi", "deadreckon"], stack: ["PWA", "UKF/EKF", "Sensor fusion"],
    description: FALLBACK_PROJECTS[2].description },
];
function projectFacts(name) {
  const k = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  return PROJECT_FACTS.find(f => f.keys.some(x => k.includes(x))) || null;
}

function repoToPayload(repo) {
  const meta = PROJECT_META[repo.name] || {};
  const facts = projectFacts(repo.name) || {};
  return {
    name: repo.name,
    description: meta.description || facts.description || repo.description || "No description provided.",
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    homepage: repo.homepage,
    html_url: repo.html_url,
    videoId: meta.videoId || null,
    stack: meta.stack || facts.stack || (repo.language ? [repo.language] : []),
  };
}

function makePlanets(projects) {
  return projects.map((project, i) => {
    const pal = PLANET_PALETTES[i % PLANET_PALETTES.length];
    const R = 0.46 + i * 0.16 + ((i * 7) % 3) * 0.03;
    return {
      i, project, pal, R,
      a0: 0.7 + i * 2.399963,                       // golden angle keeps neighbours apart
      w: 0.14 / (0.35 + R),
      size: 0.17 + ((i * 5) % 4) * 0.018,
      y: (((i * 3) % 5) - 2) * 0.012,
      seed: 1.7 + i * 6.13,
      ringRot: -0.35 + i * 0.5,
      ring: pal.ring,
    };
  });
}
const planetPos = (pl, t) => {
  const a = pl.a0 - t * pl.w;
  return [Math.cos(a) * pl.R, pl.y, Math.sin(a) * pl.R];
};

/** World point -> camera space (matches the vertex shaders). */
function toView(pos, c) {
  const x = pos[0] - c.tx, y = pos[1] - c.ty, z = pos[2] - c.tz;
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
}

/* ---- Camera timeline: keyframes keyed by scroll position s (in screens) ---- */
function buildTimeline() {
  const n = J.planets.length;
  const wide = isWide();
  const hold = 0.2;
  const sy0 = wide ? 0 : 0.16;
  const syCard = wide ? 0 : 0.27;
  const kf = [];
  const add = o => kf.push({ arc: 0, focus: null, ...o });

  add({ s: 0,    dist: 7.5, pitch: 1.05, yaw: 0,    open: 0.5,  stars: 0.18, sx: wide ? 0.27 : 0, sy: sy0 });
  add({ s: 0.9,  dist: 5.6, pitch: 0.85, yaw: 0.35, open: 0.92, stars: 0.7,  sx: wide ? 0.38 : 0, sy: syCard });
  add({ s: J.S_ABOUT - hold, dist: 4.5, pitch: 0.6, yaw: 0.8, open: 1, stars: 0.95, sx: wide ? 0.44 : 0, sy: syCard });
  add({ s: J.S_ABOUT + hold, dist: 4.5, pitch: 0.6, yaw: 0.8, open: 1, stars: 0.95, sx: wide ? 0.44 : 0, sy: syCard, arc: 0.9 });

  for (let i = 0; i < n; i++) {
    const v = {
      dist: 1.35, pitch: 0.45 + 0.08 * (i % 2), yaw: 0.9 + i * 0.9, open: 1, stars: 1,
      sx: wide ? (i % 2 === 0 ? 0.36 : -0.36) : 0, sy: wide ? 0 : 0.3, focus: i,
    };
    add({ s: sPlanet(i) - hold, ...v });
    add({ s: sPlanet(i) + hold, ...v, arc: 1.3 });
  }
  const endYaw = 0.9 + n * 0.9;
  add({ s: J.S_OUT - 0.2, dist: 6.3, pitch: 1.1, yaw: endYaw, open: 1, stars: 1, sx: 0, sy: 0 });
  add({ s: J.S_OUT + 4,   dist: 6.3, pitch: 1.1, yaw: endYaw, open: 1, stars: 1, sx: 0, sy: 0 });
  return kf;
}

function focusPos(f, t) {
  if (f == null || !J.planets.length) return [0, 0, 0];
  const i = clamp(Math.floor(f), 0, J.planets.length - 1);
  const k = clamp(Math.ceil(f), 0, J.planets.length - 1);
  const a = planetPos(J.planets[i], t), b = planetPos(J.planets[k], t);
  const u = f - i;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

function camAt(s, t) {
  const tl = J.tl;
  let j = 0;
  while (j < tl.length - 2 && s >= tl[j + 1].s) j++;
  const A = tl[j], B = tl[j + 1];
  const u = clamp((s - A.s) / (B.s - A.s), 0, 1);
  const e = u * u * (3 - 2 * u);
  const L = (x, y) => x + (y - x) * e;
  const pa = focusPos(A.focus, t), pb = focusPos(B.focus, t);
  return {
    dist:  L(A.dist, B.dist) + A.arc * Math.sin(Math.PI * u),   // pull back mid-flight
    pitch: L(A.pitch, B.pitch), yaw: L(A.yaw, B.yaw),
    open:  L(A.open, B.open),   stars: L(A.stars, B.stars),
    sx:    L(A.sx, B.sx),       sy: L(A.sy, B.sy),
    tx: L(pa[0], pb[0]), ty: L(pa[1], pb[1]), tz: L(pa[2], pb[2]),
  };
}

/* ---- Copy: the about card is written from the project data ---- */
function listWords(arr) {
  if (arr.length <= 1) return arr.join("");
  return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
}

function renderJourneyCopy() {
  const work = document.getElementById("aboutWork");
  const repos = document.getElementById("jRepos");
  const langs = document.getElementById("jLangs");
  const names = J.projects.slice(0, 3).map(p => p.name);
  const langNames = ((J.summary && J.summary.languages) || []).slice(0, 3).map(l => l.name);
  if (work) {
    work.textContent = names.length
      ? `Lately I've been building ${listWords(names)}${langNames.length ? `, mostly in ${listWords(langNames)}` : ""}.`
      : "";
  }
  if (repos) repos.textContent = J.summary ? String(J.summary.repos) : "–";
  if (langs) langs.textContent = J.summary ? String(J.summary.languages.length) : "–";
}

const safeUrl = u => (typeof u === "string" && /^https?:\/\//i.test(u)) ? u : null;

function buildJourney() {
  const host = document.getElementById("planetChapters");
  const tags = document.getElementById("planetTags");
  const rail = document.getElementById("rail");
  if (!host || !tags || !rail) return;

  J.planets = makePlanets(J.projects);
  const n = J.planets.length;
  J.S_ABOUT = 1.4; J.S_P0 = 2.7; J.STEP = 1.0;
  J.S_OUT = (n ? sPlanet(n - 1) : J.S_ABOUT) + 1.5;

  host.innerHTML = ""; tags.innerHTML = ""; rail.innerHTML = "";
  J.chapters = [
    { kind: "hero",  s: 0,         el: document.getElementById("chHero"),  label: "Home" },
    { kind: "about", s: J.S_ABOUT, el: document.getElementById("chAbout"), label: "About me" },
  ];

  J.planets.forEach(pl => {
    const p = pl.project, pal = pl.pal;
    const el = document.createElement("div");
    el.className = `chapter chapter--planet ${pl.i % 2 === 0 ? "is-left" : "is-right"}`;
    el.style.setProperty("--pa", pal.a);
    el.style.setProperty("--pb", pal.b);
    const code = safeUrl(p.html_url), live = safeUrl(p.homepage);
    el.innerHTML = `
      <article class="glass ch-card">
        <p class="ch-count">Project ${pl.i + 1} of ${n}</p>
        <h2 class="ch-title">${escapeHTML(p.name)}</h2>
        <p class="ch-desc">${escapeHTML(p.description)}</p>
        ${(p.stack || []).length ? `<div class="ch-chips">${p.stack.map(t => `<span>${escapeHTML(t)}</span>`).join("")}</div>` : ""}
        ${(p.stars || p.forks) ? `<div class="ch-meta"><span>★ ${p.stars || 0}</span><span>⑂ ${p.forks || 0}</span></div>` : ""}
        <div class="ch-actions">
          ${live ? `<a class="btn btn--primary" href="${live}" target="_blank" rel="noopener">Live demo</a>` : ""}
          ${code ? `<a class="btn ${live ? "btn--ghost" : "btn--primary"}" href="${code}" target="_blank" rel="noopener">${code === PROFILE_URL ? "GitHub profile" : "View code"}</a>` : ""}
          ${p.videoId ? `<button class="btn btn--ghost" type="button" data-act="details">Watch demo</button>` : ""}
        </div>
      </article>`;
    el.querySelector('[data-act="details"]')?.addEventListener("click", () => openProjectModal(p.name, p));
    host.appendChild(el);
    J.chapters.push({ kind: "planet", i: pl.i, s: sPlanet(pl.i), el, label: p.name, pal });

    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "ptag";
    tag.style.setProperty("--pa", pal.a);
    tag.style.setProperty("--pb", pal.b);
    tag.innerHTML = `<i></i>${escapeHTML(p.name)}`;
    tag.addEventListener("click", () => scrollToS(sPlanet(pl.i)));
    tags.appendChild(tag);
    pl.tag = tag;
  });

  J.chapters.push({ kind: "out", s: J.S_OUT, el: document.getElementById("chOut"), label: "Say hello" });

  J.chapters.forEach(c => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rail__dot";
    b.setAttribute("aria-label", c.label);
    b.innerHTML = `<span>${escapeHTML(c.label)}</span>`;
    if (c.pal) b.style.setProperty("--pa", c.pal.a);
    b.addEventListener("click", () => scrollToS(c.s));
    rail.appendChild(b);
    c.dot = b;
    c.el._vis = undefined;
  });

  renderJourneyCopy();
  layoutJourney();
}

function layoutJourney() {
  const journey = document.getElementById("journey");
  if (!journey) return;
  J.tl = buildTimeline();
  journey.style.height = `${Math.round((J.S_OUT + 1) * window.innerHeight)}px`;
}

function journeyTop() {
  const j = document.getElementById("journey");
  return j ? j.getBoundingClientRect().top + window.scrollY : 0;
}
function scrollToS(s) {
  window.scrollTo({ top: journeyTop() + s * window.innerHeight, behavior: reduceMotion ? "auto" : "smooth" });
}

/** Per-frame DOM: chapter crossfades, rail, planet name tags, aurora tint. */
function updateJourneyDom(s, cam, W, H, glOK) {
  let nearest = null, best = 99;
  for (const c of J.chapters) {
    const a = c.kind === "hero"
      ? 1 - clamp((s - 0.05) / 0.5, 0, 1)
      : clamp(1 - (Math.abs(s - c.s) - 0.2) / 0.3, 0, 1);
    c.a = a;
    const vis = a > 0.01;
    if (c.el._vis !== vis) { c.el.style.visibility = vis ? "visible" : "hidden"; c.el._vis = vis; }
    if (vis) {
      if (c.kind === "hero") c.el.style.opacity = a.toFixed(3);
      else c.el.style.setProperty("--a", a.toFixed(3));
      c.el.style.transform = `translate3d(0, ${((s - c.s) * -26).toFixed(1)}px, 0)`;
    }
    const d = Math.abs(s - c.s);
    if (d < best) { best = d; nearest = c; }
  }

  if (nearest !== J.lastNearest) {
    J.lastNearest = nearest;
    J.chapters.forEach(c => c.dot && c.dot.classList.toggle("is-active", c === nearest));
    const root = document.documentElement.style;
    const pal = nearest && nearest.pal;
    root.setProperty("--ga", pal ? `rgba(${pal.rgbA.map(v => Math.round(v * 255)).join(",")},0.20)` : "rgba(157,140,255,0.22)");
    root.setProperty("--gb", pal ? `rgba(${pal.rgbB.map(v => Math.round(v * 255)).join(",")},0.16)` : "rgba(255,143,199,0.16)");
  }

  const cue = document.getElementById("scrollCue");
  if (cue) cue.style.opacity = String(clamp(1 - s / 0.22, 0, 1));

  const aspect = W / H;
  const focusF = clamp((3.2 - cam.dist) / 1.6, 0, 1);
  const outCh = J.chapters.find(c => c.kind === "out");
  const outA = outCh ? outCh.a : 0;
  for (const pl of J.planets) {
    if (!pl.tag) continue;
    if (!glOK) { pl.tag.style.opacity = "0"; pl.tag.style.pointerEvents = "none"; continue; }
    const chap = J.chapters.find(c => c.kind === "planet" && c.i === pl.i);
    const v = toView(planetPos(pl, cam.t), cam);
    const d = cam.dist + v[2];
    const alpha = d < 0.5 ? 0 : cam.pAmt * (1 - Math.max(chap ? chap.a : 0, focusF, outA));
    if (alpha < 0.02) { pl.tag.style.opacity = "0"; pl.tag.style.pointerEvents = "none"; continue; }
    const nx = v[0] / d * 2.9 / aspect + cam.sx, ny = v[1] / d * 2.9 + cam.sy;
    const x = (nx * 0.5 + 0.5) * W;
    const y = (0.5 - ny * 0.5) * H;
    const rpx = pl.size / d * 2.9 * 0.5 * H;
    const off = x < -40 || x > W + 40 || y < -40 || y > H + 40;
    pl.tag.style.opacity = off ? "0" : alpha.toFixed(2);
    pl.tag.style.pointerEvents = off || alpha < 0.5 ? "none" : "auto";
    pl.tag.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + Math.min(rpx, 140) + 14).toFixed(1)}px, 0) translateX(-50%)`;
  }
}

/* =========================================================
   WebGL renderer: stars, galaxy particles, procedural planets
   ========================================================= */
function createGalaxyRenderer(container) {
  const canvas = document.createElement("canvas");
  let gl = null;
  try { gl = canvas.getContext("webgl", { antialias: false, alpha: false }); } catch {}
  if (!gl) return null;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const small = window.innerWidth < 700;
  const PARTICLES = small ? 50000 : 130000;
  const STARS = small ? 5000 : 9000;

  const U = (p, n) => {
    p._u = p._u || {};
    if (!(n in p._u)) p._u[n] = gl.getUniformLocation(p, n);
    return p._u[n];
  };
  function program(vsSrc, fsSrc, attribs) {
    const p = gl.createProgram();
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
      return s;
    };
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc));
    Object.entries(attribs).forEach(([n, i]) => gl.bindAttribLocation(p, i, n));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("galaxy program failed:", gl.getProgramInfoLog(p)); return null; }
    return p;
  }

  /* shared camera maths, same as toView() above */
  const CAM_GLSL = `
    vec3 viewSpace(vec3 p, vec3 target, float yaw, float pitch){
      p -= target;
      float cy = cos(yaw), sy = sin(yaw);
      p.xz = vec2(p.x * cy + p.z * sy, -p.x * sy + p.z * cy);
      float cp = cos(pitch), sp = sin(pitch);
      p.yz = vec2(p.y * cp - p.z * sp, p.y * sp + p.z * cp);
      return p;
    }`;

  /* ---- Stars: far-away directions, so they sweep as the camera turns ---- */
  const starVS = `
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
  const starFS = `precision mediump float; varying vec3 col;
    void main(){ float f = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(col * f, 1.0); }`;

  /* ---- Galaxy particles ---- */
  const galVS = `
    attribute vec4 a;      // x radius, y arm scatter, z radial jitter, w arm index
    attribute float h;     // vertical scatter
    uniform float t, aspect, dist, dpr, shiftX, shiftY, yaw, pitch, open, tintAmt;
    uniform vec3 tint, target;
    varying vec3 col;
    ${CAM_GLSL}
    void main(){
      float r  = a.x;
      float rr = pow(r, 1.15) * 1.7 * mix(0.5, 1.0, open);          // the galaxy opens up
      float spread = 0.10 + 1.0 * pow(r, 1.3);
      float omega  = 0.28 / (0.35 + rr);
      float ang = a.w * 3.14159265 + rr * 2.6 + a.y * spread - t * omega;
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
      col = c * mix(0.30, 1.0, ridge) * mix(1.15, 0.5, r);
      float lum = dot(col, vec3(0.34));
      col = mix(col, tint * lum * 2.4, tintAmt);
    }`;
  const galFS = `precision mediump float; varying vec3 col;
    void main(){ float f = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)); gl_FragColor = vec4(col * f * 0.85, 1.0); }`;

  /* ---- Planets: lit sphere + atmosphere + optional ring, drawn on a quad ---- */
  const plVS = `
    attribute vec2 corner;
    uniform vec3 pos, target;
    uniform float rad, scale, yaw, pitch, dist, aspect, shiftX, shiftY;
    varying vec2 vUv;
    ${CAM_GLSL}
    void main(){
      vec3 p = viewSpace(pos, target, yaw, pitch);
      float d = dist + p.z;
      vUv = corner;
      if (d < 0.25) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vec2 c = (p.xy + corner * rad * scale) / d * 2.9;
      gl_Position = vec4(c.x / aspect + shiftX, c.y + shiftY, 0.0, 1.0);
    }`;
  const plFS = `
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
      if (q.y < 0.0)  res = over(ringCol, res);   // far half of the ring
      res = over(sph, res);
      if (q.y >= 0.0) res = over(ringCol, res);   // near half of the ring
      gl_FragColor = res * appear;
    }`;

  const pStars = program(starVS, starFS, { s: 0 });
  const pGal   = program(galVS, galFS, { a: 0, h: 1 });
  const pPlan  = program(plVS, plFS, { corner: 0 });
  if (!pStars || !pGal || !pPlan) return null;

  /* ---- Buffers ---- */
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const galData = new Float32Array(PARTICLES * 5);
  for (let i = 0; i < PARTICLES; i++) {
    const o = i * 5;
    galData[o]     = Math.pow(Math.random(), 0.8);
    galData[o + 1] = Math.random() < 0.12 ? (Math.random() * 2 - 1) * 3.5 : gauss();
    galData[o + 2] = gauss();
    galData[o + 3] = i % 2;
    galData[o + 4] = gauss();
  }
  const galBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, galBuf);
  gl.bufferData(gl.ARRAY_BUFFER, galData, gl.STATIC_DRAW);

  const starData = new Float32Array(STARS * 4);
  for (let i = 0; i < STARS; i++) {
    const z = Math.random() * 2 - 1, ph = Math.random() * Math.PI * 2, rxy = Math.sqrt(1 - z * z);
    starData[i * 4] = rxy * Math.cos(ph); starData[i * 4 + 1] = z; starData[i * 4 + 2] = rxy * Math.sin(ph);
    starData[i * 4 + 3] = Math.random();
  }
  const starBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
  gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  container.appendChild(canvas);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return false;
    const W = Math.round(w * DPR), H = Math.round(h * DPR);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
    return true;
  }

  const cam3 = (p, c) => {
    gl.uniform1f(U(p, "yaw"), c.yaw);
    gl.uniform1f(U(p, "pitch"), c.pitch);
    gl.uniform1f(U(p, "aspect"), c.aspect);
    gl.uniform1f(U(p, "shiftX"), c.sx);
    gl.uniform1f(U(p, "shiftY"), c.sy);
  };

  function draw(st) {
    const c = st.cam;
    gl.clearColor(0.024, 0.02, 0.05, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);                                   // additive glow

    // stars
    gl.useProgram(pStars);
    gl.bindBuffer(gl.ARRAY_BUFFER, starBuf);
    gl.enableVertexAttribArray(0); gl.disableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    cam3(pStars, c);
    gl.uniform1f(U(pStars, "t"), st.t);
    gl.uniform1f(U(pStars, "amt"), c.stars);
    gl.uniform1f(U(pStars, "dpr"), DPR);
    gl.drawArrays(gl.POINTS, 0, STARS);

    // galaxy
    gl.useProgram(pGal);
    gl.bindBuffer(gl.ARRAY_BUFFER, galBuf);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 20, 16);
    cam3(pGal, c);
    gl.uniform1f(U(pGal, "t"), st.t);
    gl.uniform1f(U(pGal, "dist"), c.dist);
    gl.uniform1f(U(pGal, "dpr"), DPR);
    gl.uniform1f(U(pGal, "open"), c.open);
    gl.uniform3f(U(pGal, "target"), c.tx, c.ty, c.tz);
    gl.uniform3f(U(pGal, "tint"), st.tint[0], st.tint[1], st.tint[2]);
    gl.uniform1f(U(pGal, "tintAmt"), st.tintAmt);
    gl.drawArrays(gl.POINTS, 0, Math.min(PARTICLES, st.count));

    // planets (far to near, normal alpha blending)
    if (st.pAmt > 0.01 && st.planets.length) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pPlan);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(0); gl.disableVertexAttribArray(1);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      cam3(pPlan, c);
      gl.uniform1f(U(pPlan, "dist"), c.dist);
      gl.uniform3f(U(pPlan, "target"), c.tx, c.ty, c.tz);
      const zoomF = clamp((3.2 - c.dist) / 1.6, 0, 1);

      const origin = toView([0, 0, 0], c);
      const list = st.planets.map(pl => {
        const pos = planetPos(pl, st.t);
        return { pl, pos, v: toView(pos, c) };
      }).sort((x, y) => y.v[2] - x.v[2]);

      for (const { pl, pos, v } of list) {
        const pal = pl.pal;
        let cx = origin[0] - v[0], cy = origin[1] - v[1], cz = -(origin[2] - v[2]);   // toward the galactic core
        const cn = Math.hypot(cx, cy, cz) || 1;
        const lx = -0.5 + (cx / cn) * 0.45, ly = 0.55 + (cy / cn) * 0.45, lz = 0.7 + (cz / cn) * 0.45;   // key light from upper-left, core adds a rim
        const fn = Math.hypot(lx, ly, lz) || 1;
        const dT = Math.hypot(pos[0] - c.tx, pos[1] - c.ty, pos[2] - c.tz);
        const mul = 1 - zoomF * (1 - smooth01(1 - dT / 0.5)) * 0.82;
        gl.uniform1f(U(pPlan, "appear"), st.pAmt * mul);
        gl.uniform3f(U(pPlan, "pos"), pos[0], pos[1], pos[2]);
        gl.uniform1f(U(pPlan, "rad"), pl.size * (0.5 + 0.5 * st.pAmt));
        gl.uniform1f(U(pPlan, "scale"), pl.ring ? 2.4 : 1.6);
        gl.uniform3f(U(pPlan, "colA"), pal.rgbA[0], pal.rgbA[1], pal.rgbA[2]);
        gl.uniform3f(U(pPlan, "colB"), pal.rgbB[0], pal.rgbB[1], pal.rgbB[2]);
        gl.uniform3f(U(pPlan, "atmo"), pal.rgbAtmo[0], pal.rgbAtmo[1], pal.rgbAtmo[2]);
        gl.uniform3f(U(pPlan, "L"), lx / fn, ly / fn, lz / fn);
        gl.uniform1f(U(pPlan, "ring"), pl.ring ? 1 : 0);
        gl.uniform1f(U(pPlan, "ringTilt"), 0.32);
        gl.uniform1f(U(pPlan, "ringRot"), pl.ringRot);
        gl.uniform1f(U(pPlan, "style"), pal.style);
        gl.uniform1f(U(pPlan, "seed"), pl.seed);
        gl.uniform1f(U(pPlan, "spin"), st.t * 0.12 + pl.seed);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
  }

  return { resize, draw, particles: PARTICLES };
}

/* =========================================================
   Galaxy controller: camera, scroll, input, public API
   ========================================================= */
function initHeroGalaxy() {
  const hero      = document.getElementById("hero");
  const container = document.getElementById("galaxyBg");
  const journey   = document.getElementById("journey");
  if (!hero || !container || !journey) return;

  const renderer = createGalaxyRenderer(container);
  if (!renderer) document.body.classList.add("no-webgl");

  const BG_DIST = 4.4, BG_PITCH = 1.0, FLY_DIST = 0.9, FLY_MS = 650;

  const view = { dist: 7.5, pitch: 1.05, yaw: 0, open: 0.5, stars: 0.18, sx: 0, sy: 0, tx: 0, ty: 0, tz: 0, pAmt: 0 };
  const user = { yaw: 0, pitch: 0, vel: 0 };          // mouse-drag offsets on top of the scroll camera
  let mode = "hero", flying = false, sS = 0, tAcc = 0, bgYaw = 0, last = performance.now();
  let speed = 1, speedTarget = 1, tintAmt = 0, tintAmtTarget = 0;
  const tint = [1, 1, 1], tintTarget = [1, 1, 1];

  /* ---- Mouse drag = rotate (touch keeps scrolling the page) ---- */
  let dragging = null;
  hero.addEventListener("pointerdown", e => {
    if (flying || e.pointerType === "touch" || e.button !== 0) return;
    if (e.target.closest("a, button, input, textarea, .glass, .rail")) return;
    dragging = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { hero.setPointerCapture(e.pointerId); } catch {}
    user.vel = 0;
    hero.classList.add("is-dragging");
  });
  hero.addEventListener("pointermove", e => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
    dragging.x = e.clientX; dragging.y = e.clientY;
    user.yaw += dx * 0.0065;
    user.pitch = clamp(user.pitch + dy * 0.005, -1.0, 1.0);
    user.vel = dx * 0.0065;
  });
  const endDrag = e => {
    if (dragging && e.pointerId === dragging.id) { dragging = null; hero.classList.remove("is-dragging"); }
  };
  hero.addEventListener("pointerup", endDrag);
  hero.addEventListener("pointercancel", endDrag);
  hero.addEventListener("dblclick", e => {
    if (!e.target.closest("a, button, input, textarea, .glass, .rail")) api.resetView();
  });

  document.addEventListener("pointermove", e => {
    const g = e.target.closest && e.target.closest(".glass");
    if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty("--mx", `${e.clientX - r.left}px`);
    g.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  window.addEventListener("resize", () => { if (J.planets) layoutJourney(); });

  /* ---- Public API (used by routing, terminal, palette, card hover) ---- */
  const hexTo = hex => hexToRgb(hex);
  const api = {
    setMode(m) { mode = m; flying = false; speedTarget = 1; },
    flyIn() {
      return new Promise(resolve => {
        flying = true; dragging = null; user.vel = 0;
        hero.classList.remove("is-dragging");
        speedTarget = 5;
        setTimeout(resolve, FLY_MS);
      });
    },
    resetView() { user.yaw = 0; user.pitch = 0; user.vel = 0; },
    react(hex) {
      if (hex) {
        const c = hexTo(hex);
        tintTarget[0] = c[0]; tintTarget[1] = c[1]; tintTarget[2] = c[2];
        tintAmtTarget = 0.6; speedTarget = 2.6;
      } else { tintAmtTarget = 0; speedTarget = 1; }
    },
    setProjects(projects, summary) {
      J.projects = projects;
      J.summary = summary || J.summary;
      buildJourney();
    },
    scrollToS: scrollToS,
    /** jump straight to the scroll position's camera (used by tests) */
    snap() {
      const s = clamp(-journey.getBoundingClientRect().top / window.innerHeight, 0, J.S_OUT);
      sS = s;
      const g = camAt(s, tAcc);
      Object.assign(view, g, { pAmt: smooth01((s - 0.55) / 0.7) });
    },
  };
  galaxy = api;
  if (location.search.includes("debug")) window.__galaxy = api;

  /* ---- Frame loop ---- */
  function frame(now) {
    requestAnimationFrame(frame);
    const W = container.clientWidth, H = container.clientHeight;
    if (!W || !H) return;
    if (renderer) renderer.resize();

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    speed   += (speedTarget   - speed)   * 0.08;
    tintAmt += (tintAmtTarget - tintAmt) * 0.10;
    for (let i = 0; i < 3; i++) tint[i] += (tintTarget[i] - tint[i]) * 0.10;
    if (!reduceMotion) tAcc += dt * speed;

    let goal;
    if (mode === "hero") {
      const sRaw = clamp(-journey.getBoundingClientRect().top / window.innerHeight, 0, J.S_OUT);
      sS += (sRaw - sS) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 7));
      goal = camAt(sS, tAcc);
      goal.pAmt = smooth01((sS - 0.55) / 0.7);
    } else {
      if (!reduceMotion) bgYaw += dt * 0.03;
      goal = { dist: BG_DIST, pitch: BG_PITCH, yaw: bgYaw, open: 1, stars: 0.8, sx: 0, sy: 0, tx: 0, ty: 0, tz: 0, pAmt: 0 };
    }
    if (flying) goal.dist = FLY_DIST;

    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 8);
    for (const key of Object.keys(goal)) view[key] += (goal[key] - view[key]) * k;

    if (!dragging) {                                       // inertia, then settle back to the scroll camera
      user.yaw += user.vel; user.vel *= 0.94;
      user.yaw *= Math.exp(-dt * 0.35);
      user.pitch *= Math.exp(-dt * 0.7);
    }

    const cam = {
      ...view,
      yaw: view.yaw + user.yaw,
      pitch: clamp(view.pitch + user.pitch, -1.5, 1.5),
      aspect: W / H, t: tAcc,
    };

    if (renderer) {
      renderer.draw({
        cam, t: tAcc, tint, tintAmt, pAmt: mode === "hero" ? view.pAmt : 0,
        planets: J.planets,
        count: mode === "hero" ? renderer.particles : Math.floor(renderer.particles * 0.6),
      });
    }
    if (mode === "hero") updateJourneyDom(sS, cam, W, H, !!renderer);
  }
  requestAnimationFrame(frame);
  container.classList.add("is-ready");

  api.setProjects(FALLBACK_PROJECTS, null);
}

/* ---- Project-card hover -> galaxy reacts (tint = the repo's language colour) ---- */
const LANG_COLORS = {
  Python: "#4b8bbe", JavaScript: "#f0db4f", TypeScript: "#3178c6", "C++": "#f34b7d", C: "#9aa3ad",
  HTML: "#e34c26", CSS: "#7a5cff", "Jupyter Notebook": "#f37626", Java: "#e76f00", Go: "#00add8",
  Rust: "#dea584", PHP: "#8892bf", Shell: "#89e051", "C#": "#9b4fd0", Kotlin: "#a97bff", Dart: "#00b4ab",
};

function initCardReactions() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;
  grid.addEventListener("pointerover", e => {
    const card = e.target.closest(".card");
    if (!card || !galaxy) return;
    const lang = card.querySelector(".card__lang")?.textContent?.trim();
    galaxy.react(LANG_COLORS[lang] || "#ff9ccf");
  });
  grid.addEventListener("pointerout", e => {
    if (!galaxy) return;
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".card")) galaxy.react(null);
  });
}

/* =========================================================
   F1 car — modern ground-effect-era silhouette with idle show
   ========================================================= */
function initF1Car() {
  const svgEl = document.getElementById("f1Car");
  const bg    = document.getElementById("siteBg");
  if (!svgEl || !bg) return;

  const drawTargets = svgEl.querySelectorAll(".draw");
  const fillTargets = svgEl.querySelectorAll(
    ".fill-body, .fill-wing, .fill-accent, .fill-stripe, .wheel .hub"
  );
  const glowTargets = svgEl.querySelectorAll(".brake-glow");
  const groundGlow  = svgEl.querySelector(".ground-glow");
  const lightTarget = svgEl.querySelector(".rain-light");
  const turboPop    = svgEl.querySelector(".turbo-pop");
  const drsFlap     = svgEl.querySelector(".drs-flap");
  const speedLines  = svgEl.querySelectorAll(".speed-line");
  const sparks      = svgEl.querySelectorAll(".spark");

  /* ---- Fallback for reduced motion or missing svg utils ---- */
  if (reduceMotion || !svgUtils) {
    drawTargets.forEach(el => {
      el.style.strokeDasharray  = "none";
      el.style.strokeDashoffset = "0";
    });
    fillTargets.forEach(el => { el.style.fillOpacity = "1"; el.style.opacity = "1"; });
    glowTargets.forEach(el => { el.style.opacity = "0.7"; });
    if (groundGlow)  groundGlow.style.opacity  = "0.6";
    if (lightTarget) lightTarget.style.opacity = "0.9";
    bg.classList.add("is-ready");
    return;
  }

  /* ---- Sketch out the car ---- */
  const drawables = svgUtils.createDrawable([...drawTargets]);
  bg.classList.add("is-ready");

  const tl = createTimeline({
    defaults: { ease: "inOutSine" },
    onComplete: () => { startIdleAnimation(); },
  });

  tl
    .add(drawables, {
      draw: ["0 0", "0 1"],
      duration: 950,
      delay: stagger(30),
    })
    .add(fillTargets, {
      fillOpacity: [0, 1],
      duration: 520,
      delay: stagger(22),
      ease: "outQuad",
    }, "-=500")
    .add(groundGlow, {
      opacity: [0, 0.75],
      duration: 900,
      ease: "outQuad",
    }, "-=500")
    .add(glowTargets, {
      opacity: [0, 0.85],
      duration: 600,
      delay: stagger(60),
      ease: "outQuad",
    }, "-=450")
    .add(lightTarget, {
      opacity: [0, 0.95],
      duration: 400,
      ease: "outQuad",
    }, "-=400");

  function startIdleAnimation() {

    /* ---- Speed lines streak behind the car ---- */
    speedLines.forEach((line, i) => {
      animate(line, {
        translateX: [1400, -500],
        opacity: [0, 0.9, 0],
        duration: 1800 + i * 160,
        delay: i * 260,
        loop: true,
        ease: "inQuad",
      });
    });

    /* ---- Sparks fly off the floor ---- */
    sparks.forEach((s, i) => {
      animate(s, {
        translateY: [0, -30],
        translateX: [0, -70 - Math.random() * 60],
        opacity: [0, 1, 0],
        duration: 700 + Math.random() * 400,
        delay: i * 140,
        loop: true,
        ease: "outQuad",
      });
    });

    /* ---- Wheels spin ---- */
    animate(svgEl.querySelectorAll(".wheel"), {
      rotate: 360,
      duration: 900,
      ease: "linear",
      loop: true,
      delay: stagger(80, { start: 200 }),
    });

    /* ---- DRS flap opens and closes ---- */
    if (drsFlap) {
      animate(drsFlap, {
        rotate: [-22, 0],
        duration: 900,
        ease: "inOutQuad",
        loop: true,
        alternate: true,
        loopDelay: 400,
      });
    }

    /* ---- Brake discs pulse ---- */
    animate(glowTargets, {
      opacity: [0.4, 0.9],
      duration: 1100,
      ease: "inOutSine",
      loop: true,
      alternate: true,
      delay: stagger(140),
    });

    /* ---- Ground glow breathes ---- */
    if (groundGlow) {
      animate(groundGlow, {
        opacity: [0.45, 0.85],
        duration: 1600,
        ease: "inOutSine",
        loop: true,
        alternate: true,
      });
    }

    /* ---- Rain light blinks ---- */
    if (lightTarget) {
      animate(lightTarget, {
        opacity: [0.95, 0.1],
        duration: 240,
        ease: "inOutSine",
        loop: true,
        alternate: true,
        delay: 1400,
      });
    }

    /* ---- Turbo pop from the exhaust ---- */
    if (turboPop) {
      animate(turboPop, {
        r: [
          { to: 0,  duration: 0   },
          { to: 22, duration: 90  },
          { to: 0,  duration: 320 },
        ],
        opacity: [
          { to: 0, duration: 0   },
          { to: 1, duration: 60  },
          { to: 0, duration: 320 },
        ],
        duration: 500,
        delay: 4200,
        loop: true,
        loopDelay: 3200,
        ease: "outQuad",
      });
    }

    /* ---- Chassis bob ---- */
    animate(".car-float", {
      translateY: [0, -8, 0],
      duration: 4600,
      ease: "inOutSine",
      loop: true,
    });

    initCarParallax();
  }
}

function initCarParallax() {
  const group = document.getElementById("carParallax");
  if (!group) return;

  window.addEventListener("mousemove", (e) => {
    const nx = e.clientX / window.innerWidth  - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    group.style.transform = `translate(${nx * 28}px, ${ny * 18}px)`;
  }, { passive: true });
}

/* =========================================================
   GitHub repos → project cards
   ========================================================= */
async function loadProjects() {
  const grid       = document.getElementById("projectsGrid");
  const status     = document.getElementById("projectsStatus");
  const countLabel = document.getElementById("repoCount");

  try {
    const repos = await getRepos();
    if (!repos.length) {
      if (status) status.textContent = "No public repositories to show yet.";
      return;
    }
    if (status) status.remove();
    if (countLabel) countLabel.textContent = `${repos.length} repositories`;

    grid.innerHTML = repos.map(repoCardHTML).join("");

    grid.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        openProjectModal(card.dataset.repo, JSON.parse(card.dataset.payload));
      });
      card.querySelector('[data-action="video"]')?.addEventListener("click", (e) => {
        e.stopPropagation();
        openProjectModal(card.dataset.repo, JSON.parse(card.dataset.payload));
      });
    });

    revealCardsIfActive();
  } catch (err) {
    console.error("GitHub fetch failed:", err);
    if (status) status.textContent = "Couldn't load GitHub projects right now — check back shortly.";
  }
}

let ghDataPromise = null;
const GH = { top: [], summary: null, activity: null };   // filled as data arrives (used by terminal + palette)

function getGitHubData() {
  if (!ghDataPromise) {
    ghDataPromise = (async () => {
      const cached = readCache();
      if (cached && cached.top) { GH.top = cached.top; GH.summary = cached.summary; return cached; }

      const res = await fetch(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`
      );
      if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
      const all = await res.json();

      const own = all.filter(r => !r.fork);
      const top = own
        .filter(r => r.description)
        .sort((x, y) => y.stargazers_count - x.stargazers_count)
        .slice(0, REPO_COUNT);

      const counts = {};
      own.forEach(r => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
      const languages = Object.entries(counts)
        .sort((x, y) => y[1] - x[1])
        .map(([name, count]) => ({ name, count }));

      const data = { top, summary: { repos: own.length, languages } };
      writeCache(data);
      GH.top = top; GH.summary = data.summary;
      return data;
    })().catch(err => { ghDataPromise = null; throw err; });
  }
  return ghDataPromise;
}

async function getRepos() {
  return (await getGitHubData()).top;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {}
}

function repoCardHTML(repo) {
  const meta = PROJECT_META[repo.name] || {};
  const payload = {
    name: repo.name,
    description: meta.description || repo.description || "No description provided.",
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    homepage: repo.homepage,
    html_url: repo.html_url,
    videoId: meta.videoId || null,
    stack: meta.stack || (repo.language ? [repo.language] : []),
  };
  return `
    <article class="card" data-repo="${repo.name}" data-payload='${JSON.stringify(payload).replace(/'/g, "&#39;")}'>
      <div class="card__top">
        <h3 class="card__name">${escapeHTML(repo.name)}</h3>
        ${repo.language ? `<span class="card__lang">${escapeHTML(repo.language)}</span>` : ""}
      </div>
      <p class="card__desc">${escapeHTML(payload.description)}</p>
      <div class="card__stats">
        <span>★ ${repo.stargazers_count}</span>
        <span>⑂ ${repo.forks_count}</span>
      </div>
      <div class="card__actions">
        ${repo.homepage
          ? `<a class="btn btn--ghost" href="${repo.homepage}" target="_blank" rel="noopener">Live demo</a>`
          : `<a class="btn btn--ghost" href="${repo.html_url}" target="_blank" rel="noopener">Code</a>`}
        ${payload.videoId ? `<button class="btn btn--ghost" data-action="video">Watch demo</button>` : ""}
      </div>
    </article>`;
}

function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let cardsRevealed = false;

function revealCardsIfActive() {
  if (document.body.dataset.route !== "projects") return;
  if (cardsRevealed) return;

  const cards = document.querySelectorAll(".card");
  if (!cards.length) return;
  cardsRevealed = true;

  if (reduceMotion) {
    cards.forEach(c => { c.style.opacity = 1; c.style.transform = "none"; });
    return;
  }

  animate(cards, {
    translateY: [24, 0],
    opacity: [0, 1],
    duration: 600,
    delay: stagger(60),
    ease: "outCubic",
  });
}

/* =========================================================
   Project modal
   ========================================================= */
const projectModal = document.getElementById("projectModal");

function openProjectModal(name, data) {
  document.getElementById("modalTitle").textContent = data.name;
  document.getElementById("modalDesc").textContent  = data.description;
  document.getElementById("modalStack").innerHTML   = (data.stack || [])
    .map(t => `<span>${escapeHTML(t)}</span>`).join("");
  document.getElementById("modalLinks").innerHTML = `
    <a class="btn btn--ghost" href="${data.html_url}" target="_blank" rel="noopener">GitHub</a>
    ${data.homepage ? `<a class="btn btn--primary" href="${data.homepage}" target="_blank" rel="noopener">Live site</a>` : ""}`;

  const videoWrap = document.getElementById("modalVideoWrap");
  if (data.videoId) {
    videoWrap.style.display = "block";
    videoWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${data.videoId}" title="${escapeHTML(data.name)} demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  } else {
    videoWrap.style.display = "none";
    videoWrap.innerHTML = "";
  }

  openModal(projectModal);
}

document.getElementById("modalClose").addEventListener("click", () => closeModal(projectModal));

/* =========================================================
   Resume modal
   ========================================================= */
const resumeModal = document.getElementById("resumeModal");
document.getElementById("openResume").addEventListener("click", () => openModal(resumeModal));
document.getElementById("openResumeHome")?.addEventListener("click", () => openModal(resumeModal));
document.getElementById("resumeClose").addEventListener("click", () => closeModal(resumeModal));
document.getElementById("downloadResume").addEventListener("click", () => window.print());

/* =========================================================
   Modal open / close
   ========================================================= */
function openModal(overlay) {
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";

  const panel = overlay.querySelector(".modal");

  if (reduceMotion) {
    overlay.style.opacity = "1";
    if (panel) panel.style.transform = "none";
    return;
  }

  animate(overlay, { opacity: [0, 1], duration: 220, ease: "outQuad" });
  if (panel) {
    animate(panel, {
      scale: [0.96, 1],
      opacity: [0, 1],
      duration: 280,
      ease: "outCubic",
    });
  }
}

function closeModal(overlay) {
  const finish = () => {
    overlay.classList.remove("open");
    overlay.style.opacity = "";
    const panel = overlay.querySelector(".modal");
    if (panel) panel.style.transform = "";
    document.body.style.overflow = "";
    const iframe = overlay.querySelector("iframe");
    if (iframe) iframe.src = iframe.src;
  };

  if (reduceMotion) return finish();

  animate(overlay, {
    opacity: [1, 0],
    duration: 180,
    ease: "inQuad",
    onComplete: finish,
  });
}

[projectModal, resumeModal].forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (projectModal.classList.contains("open")) closeModal(projectModal);
  if (resumeModal.classList.contains("open"))  closeModal(resumeModal);
});

/* =========================================================
   About: counters + skill bars
   ========================================================= */
function animateStats() {
  document.querySelectorAll(".stat__num").forEach(el => {
    if (el.dataset.count === undefined) return;          // still loading -> keep the placeholder dash
    const target = parseInt(el.dataset.count, 10) || 0;

    if (reduceMotion) {
      el.textContent = String(target);
      return;
    }

    const obj = { val: 0 };
    animate(obj, {
      val: target,
      modifier: utils.round(0),
      duration: 1200,
      ease: "outCubic",
      onUpdate: () => { el.textContent = obj.val; },
    });
  });
}

function animateSkills() {
  document.querySelectorAll(".skill__fill").forEach(el => {
    el.style.width = `${el.dataset.level}%`;
  });
}

/* =========================================================
   Contact form
   ========================================================= */
const form     = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name    = document.getElementById("name");
  const email   = document.getElementById("email");
  const message = document.getElementById("message");

  let valid = true;
  valid = validateField(name,  name.value.trim().length > 0) && valid;
  valid = validateField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) && valid;
  valid = validateField(message, message.value.trim().length > 4) && valid;

  if (!valid) return;

  const submitBtn = document.getElementById("submitBtn");
  if (!reduceMotion) {
    animate(submitBtn, {
      scale: [1, 0.96, 1],
      duration: 320,
      ease: "inOutQuad",
    });
  }

  sendMessage({ name: name.value.trim(), email: email.value.trim(), message: message.value.trim() });
});

let formNoteTimer;
function showFormNote(text, ms = 5000) {
  formNote.textContent = text;
  formNote.classList.add("show");
  clearTimeout(formNoteTimer);
  formNoteTimer = setTimeout(() => formNote.classList.remove("show"), ms);
}

async function sendMessage(payload) {
  if (!FORM_ENDPOINT) {
    showFormNote("The contact form isn't connected yet — please reach out on GitHub for now.", 7000);
    return;
  }
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    form.reset();
    showFormNote("Thanks — that came through. I'll reply soon.");
  } catch (err) {
    console.warn("contact form failed:", err);
    showFormNote("Couldn't send that just now — please try again in a moment.");
  }
}

function validateField(input, isValid) {
  const field = input.closest(".field");
  field.classList.toggle("error", !isValid);
  return isValid;
}

/* =========================================================
   Project metadata
   ========================================================= */
async function loadProjectMeta() {
  try {
    const res = await fetch("projects.json");
    if (res.ok) PROJECT_META = await res.json();
  } catch {}
}

/* =========================================================
   GitHub insights: stats, language chips, latest commit, heatmap
   ========================================================= */
const ACT_KEY = `gh_act_v1_${GITHUB_USERNAME}`;
const ACT_TTL_MS = 30 * 60 * 1000;
const ACTIVITY_TYPES = new Set([
  "PushEvent", "PullRequestEvent", "PullRequestReviewEvent",
  "IssuesEvent", "CreateEvent", "CommitCommentEvent",
]);
const HEAT_WEEKS = 13;

const pad2 = n => String(n).padStart(2, "0");
const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90)        return "just now";
  if (s < 3600)      return `${Math.round(s / 60)} min ago`;
  if (s < 86400)     return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 14) return `${Math.round(s / 86400)} days ago`;
  if (s < 86400 * 60) return `${Math.round(s / 604800)} weeks ago`;
  return `${Math.round(s / 2592000)} months ago`;
}

async function getActivity() {
  try {
    const raw = localStorage.getItem(ACT_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (Date.now() - c.timestamp < ACT_TTL_MS) return c.data;
    }
  } catch {}

  const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=100`);
  if (!res.ok) throw new Error(`GitHub events responded ${res.status}`);
  const events = await res.json();

  const days = {};
  let oldest = null;
  events.forEach(ev => {
    const d = new Date(ev.created_at);
    if (!oldest || d < oldest) oldest = d;
    if (!ACTIVITY_TYPES.has(ev.type)) return;
    const k = dayKey(d);
    days[k] = (days[k] || 0) + 1;
  });

  // The events feed holds at most 100 events here; if it's full, older days are unknown, not empty.
  const since = events.length >= 100 && oldest ? oldest.toISOString() : null;

  let latest = null;
  const push = events.find(ev => ev.type === "PushEvent");
  if (push) {
    latest = { repo: push.repo.name, when: push.created_at, url: `https://github.com/${push.repo.name}` };
    try {
      const cr = await fetch(
        `https://api.github.com/repos/${push.repo.name}/commits?per_page=1&author=${encodeURIComponent(GITHUB_USERNAME)}`
      );
      if (cr.ok) {
        const [c] = await cr.json();
        if (c) {
          latest.message = String(c.commit?.message || "").split("\n")[0].slice(0, 140);
          latest.sha  = String(c.sha || "").slice(0, 7);
          latest.url  = c.html_url || latest.url;
          latest.when = c.commit?.author?.date || latest.when;
        }
      }
    } catch {}
  }

  const data = { days, since, latest };
  try { localStorage.setItem(ACT_KEY, JSON.stringify({ timestamp: Date.now(), data })); } catch {}
  return data;
}

function setStat(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.count = String(n);
  if (document.body.dataset.route === "about") animateStats();
  else el.textContent = String(n);
}

function renderChips(languages) {
  const box = document.getElementById("chipList");
  if (!box) return;
  box.querySelectorAll(".chip:not(.chip--focus)").forEach(n => n.remove());
  languages.slice(0, 8).forEach(l => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = l.name;
    const em = document.createElement("em");
    em.textContent = l.count;
    chip.appendChild(em);
    box.appendChild(chip);
  });
}

function renderHeat(act) {
  const el = document.getElementById("ghHeat");
  if (!el) return 0;
  el.innerHTML = "";

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (HEAT_WEEKS - 1) * 7);   // a Sunday, 12 weeks back
  const since = act.since ? new Date(act.since) : null;
  if (since) since.setHours(0, 0, 0, 0);

  const counts = Object.values(act.days);
  const max = Math.max(1, ...counts);
  let activeDays = 0;

  for (let i = 0; i < HEAT_WEEKS * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const cell = document.createElement("b");
    if (d > today) {
      cell.className = "is-future";
    } else if (since && d < since) {
      cell.className = "is-unknown";
      cell.title = "older than GitHub's public feed shows";
    } else {
      const n = act.days[dayKey(d)] || 0;
      if (n) activeDays++;
      const lvl = n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
      if (lvl) cell.className = "l" + lvl;
      cell.title = `${n} ${n === 1 ? "event" : "events"} · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
    el.appendChild(cell);
  }
  return activeDays;
}

function renderCommit(act) {
  const box = document.getElementById("ghCommit");
  if (!box) return;
  const l = act.latest;
  if (!l) {
    box.textContent = "No recent public pushes — a quiet stretch, or the current work lives in private repos.";
    return;
  }
  const repoName = l.repo.split("/").pop();
  const safeUrl = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/commit\/[0-9a-f]+)?$/.test(l.url) ? l.url : `https://github.com/${GITHUB_USERNAME}`;
  const msg = l.message ? escapeHTML(l.message) : `Pushed to ${escapeHTML(repoName)}`;
  box.innerHTML =
    `<span class="gh-msg">${msg}</span>` +
    `<span class="gh-meta">${escapeHTML(repoName)}` +
    (l.sha ? ` · <a href="${safeUrl}" target="_blank" rel="noopener">${escapeHTML(l.sha)}</a>` : "") +
    ` · ${escapeHTML(timeAgo(l.when))}</span>`;
}

async function initGitHubInsights() {
  const panel = document.getElementById("ghPanel");

  getGitHubData().then(data => {
    setStat("statRepos", data.summary.repos);
    setStat("statLangs", data.summary.languages.length);
    renderChips(data.summary.languages);
  }).catch(err => console.warn("GitHub summary unavailable:", err));

  try {
    const act = await getActivity();
    GH.activity = act;
    renderCommit(act);
    setStat("statDays", renderHeat(act));
  } catch (err) {
    console.warn("GitHub activity unavailable:", err);
    if (panel) panel.classList.add("is-offline");
    const box = document.getElementById("ghCommit");
    if (box) box.textContent = "Couldn't reach GitHub just now — check back shortly.";
  }
}

/* =========================================================
   Terminal (About page)
   ========================================================= */
function focusTerminal() {
  const input = document.getElementById("termIn");
  if (!input) return;
  input.focus({ preventScroll: true });
  input.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
}

function goToTerminal() {
  const here = currentRoute();
  const wait = here === "/about" ? 0 : (here === "/" && !reduceMotion ? 950 : 250);
  goTo("/about");
  setTimeout(focusTerminal, wait);
}

function initTerminal() {
  const body  = document.getElementById("termBody");
  const form  = document.getElementById("termForm");
  const input = document.getElementById("termIn");
  const term  = document.getElementById("term");
  if (!body || !form || !input) return;

  const esc  = s => escapeHTML(String(s));
  const attr = s => esc(s).replace(/"/g, "&quot;");
  const link = (cmd, label) => `<span data-cmd="${attr(cmd)}">${esc(label ?? cmd)}</span>`;
  const PAGES = ["home", "projects", "about", "contact"];
  const ROUTE_OF = { home: "/", projects: "/projects", about: "/about", contact: "/contact" };

  function print(html, cls = "") {
    const d = document.createElement("div");
    d.className = "term__line " + cls;
    d.innerHTML = html;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  }

  const commands = {
    help() {
      const rows = [
        ["help", "show this list"],
        ["whoami", "who I am"],
        ["ls", "list my projects"],
        ["open <name>", "open a project"],
        ["skills", "languages I use on GitHub"],
        ["git log", "my latest GitHub activity"],
        ["goto <page>", PAGES.join(" | ")],
        ["galaxy [reset|warp]", "play with the background"],
        ["clear", "clear the screen"],
      ];
      rows.forEach(([c, d]) => print(`  <span class="k">${esc(c.padEnd(20))}</span>${esc(d)}`));
      print("  tip: press Tab to autocomplete, ↑ for history, or hit Ctrl/⌘ + K anywhere.", "dim");
    },
    whoami() {
      print("Yash Pratap Singh");
      print(`  <span class="k">role   </span>  final-year computer science student`);
      print(`  <span class="k">focus  </span>  full-stack · machine learning · systems programming`);
      print(`  <span class="k">style  </span>  project-driven — I learn by building real things`);
      print(`  <span class="k">github </span>  <a href="https://github.com/${attr(GITHUB_USERNAME)}" target="_blank" rel="noopener">github.com/${esc(GITHUB_USERNAME)}</a>`);
    },
    async ls() {
      const data = await getGitHubData().catch(() => null);
      if (!data || !data.top.length) return print("no repositories to show right now.", "dim");
      data.top.forEach(r => {
        print(`  ${link("open " + r.name, r.name.padEnd(26))}<span class="dim">${esc(r.language || "")}</span>`);
      });
      print(`  ${data.top.length} projects — click a name, or run ${link("open <name>")}`, "dim");
    },
    async open(args) {
      if (!args[0]) return print("usage: open <project-name>   (try ls)", "dim");
      const data = await getGitHubData().catch(() => null);
      const want = args[0].toLowerCase();
      const repo = data && (data.top.find(r => r.name.toLowerCase() === want) || data.top.find(r => r.name.toLowerCase().includes(want)));
      if (!repo) return print(`no project matching "${esc(args[0])}" — try ${link("ls")}`, "dim");
      const card = [...document.querySelectorAll(".card")].find(c => c.dataset.repo === repo.name);
      if (!card) return print("projects are still loading — try again in a second.", "dim");
      print(`opening ${esc(repo.name)}…`, "dim");
      openProjectModal(repo.name, JSON.parse(card.dataset.payload));
    },
    async skills() {
      const data = await getGitHubData().catch(() => null);
      const langs = data && data.summary ? data.summary.languages : [];
      if (!langs.length) return print("no language data yet.", "dim");
      const max = Math.max(...langs.map(l => l.count));
      langs.slice(0, 8).forEach(l => {
        const bar = "█".repeat(Math.max(1, Math.round((l.count / max) * 16)));
        print(`  <span class="k">${esc(l.name.padEnd(18))}</span><span class="p">${bar}</span> ${l.count}`);
      });
      print("  (repos per language, from GitHub)", "dim");
    },
    async git(args) {
      if (args[0] !== "log") return print("usage: git log", "dim");
      const act = GH.activity || await getActivity().catch(() => null);
      const l = act && act.latest;
      if (!l) return print("no recent public pushes.", "dim");
      const name = l.repo.split("/").pop();
      print(`<span class="p">${esc(l.sha || "·······")}</span>  ${esc(l.message || "pushed to " + name)}`);
      print(`         ${esc(name)} · ${esc(timeAgo(l.when))}`, "dim");
    },
    goto(args) {
      const page = (args[0] || "").toLowerCase();
      if (!ROUTE_OF[page]) return print(`usage: goto ${PAGES.join(" | ")}`, "dim");
      print(`going to ${esc(page)}…`, "dim");
      goTo(ROUTE_OF[page]);
    },
    galaxy(args) {
      if (!galaxy) return print("the galaxy needs WebGL, which isn't available here.", "dim");
      if (args[0] === "reset") { galaxy.resetView(); return print("view reset (visible on Home).", "dim"); }
      if (args[0] === "warp")  {
        galaxy.react("#ff9ccf"); setTimeout(() => galaxy.react(null), 2500);
        return print("engaging warp…", "dim");
      }
      print("usage: galaxy reset | warp", "dim");
    },
    clear() { body.innerHTML = ""; },
    sudo(args) {
      if (args.join(" ") === "hire-me") {
        print("[sudo] permission granted. opening contact…");
        setTimeout(() => goTo("/contact"), 700);
      } else {
        print("yash is not in the sudoers file. This incident will be reported.", "dim");
      }
    },
    echo(args) { print(esc(args.join(" "))); },
  };
  const ALIASES = { "?": "help", projects: "ls", activity: "git", exit: "clear" };

  const history = [];
  let hIdx = 0;

  function run(raw) {
    const line = raw.trim();
    print(`<span class="p">$</span> ${esc(line)}`);
    if (!line) return;
    history.push(line);
    hIdx = history.length;
    const parts = line.split(/\s+/);
    let name = parts[0].toLowerCase();
    let args = parts.slice(1);
    if (name === "activity") args = ["log"];
    name = ALIASES[name] || name;
    if (Object.hasOwn(commands, name)) {
      Promise.resolve(commands[name](args)).catch(err => print("error: " + esc(err.message), "dim"));
    } else {
      print(`command not found: ${esc(parts[0])} — try ${link("help")}`, "dim");
    }
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    run(v);
  });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hIdx > 0) input.value = history[--hIdx];
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] || "";
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      body.innerHTML = "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      const v = input.value;
      const [first, ...rest] = v.split(/\s+/);
      if (!rest.length) {
        const m = Object.keys(commands).filter(c => c.startsWith(first.toLowerCase()));
        if (m.length === 1) input.value = m[0] + " ";
      } else if (first === "open") {
        const m = GH.top.filter(r => r.name.toLowerCase().startsWith(rest[0].toLowerCase()));
        if (m.length === 1) input.value = "open " + m[0].name;
      } else if (first === "goto") {
        const m = PAGES.filter(pg => pg.startsWith(rest[0].toLowerCase()));
        if (m.length === 1) input.value = "goto " + m[0];
      }
    }
  });

  body.addEventListener("click", e => {
    const c = e.target.closest("[data-cmd]");
    if (c) run(c.dataset.cmd);
  });
  term.addEventListener("click", () => {
    if (!String(window.getSelection())) input.focus({ preventScroll: true });
  });

  print(`<span class="k">yash@portfolio</span> — interactive terminal. type ${link("help")} to see what it can do.`, "dim");
  run("whoami");
}

/* =========================================================
   Command palette (Ctrl/Cmd + K)
   ========================================================= */
function initCommandPalette() {
  const overlay = document.getElementById("cmdk");
  const input   = document.getElementById("cmdkInput");
  const list    = document.getElementById("cmdkList");
  const openBtn = document.getElementById("cmdkOpen");
  const keyLab  = document.getElementById("cmdkKey");
  if (!overlay || !input || !list) return;

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
  if (keyLab) keyLab.textContent = isMac ? "⌘" : "Ctrl";

  let items = [], shown = [], sel = 0, lastFocus = null, prevOverflow = "";

  function buildItems() {
    const pages = [["Home", "/"], ["Projects", "/projects"], ["About", "/about"], ["Contact", "/contact"]];
    items = pages.map(([label, route]) => ({
      group: "Pages", label: `Go to ${label}`, hint: route === "/" ? "#/" : `#${route}`, run: () => goTo(route),
    }));
    items.push(
      { group: "Actions", label: "View résumé", hint: "modal", run: () => openModal(resumeModal) },
      { group: "Actions", label: "Open terminal", hint: "about", run: goToTerminal },
      { group: "Actions", label: "Reset galaxy view", hint: "home",
        run: () => { if (currentRoute() === "/" && galaxy) galaxy.resetView(); else goTo("/"); } },
      { group: "Actions", label: "Open GitHub profile", hint: `github.com/${GITHUB_USERNAME}`,
        run: () => window.open(`https://github.com/${GITHUB_USERNAME}`, "_blank", "noopener") },
    );
    document.querySelectorAll(".card").forEach(card => {
      try {
        const d = JSON.parse(card.dataset.payload);
        items.push({ group: "Projects", label: `Open ${d.name}`, hint: d.language || "", run: () => openProjectModal(d.name, d) });
      } catch {}
    });
  }

  function score(q, text) {
    q = q.toLowerCase(); text = text.toLowerCase();
    if (!q) return 1;
    const i = text.indexOf(q);
    if (i >= 0) return 1000 - i + (i === 0 ? 50 : 0);
    let qi = 0, s = 0, prev = -2;
    for (let ti = 0; ti < text.length && qi < q.length; ti++) {
      if (text[ti] === q[qi]) { s += (ti === prev + 1) ? 5 : 1; prev = ti; qi++; }
    }
    return qi === q.length ? s : 0;
  }

  function setSel(i, scroll = true) {
    if (!shown.length) return;
    sel = (i + shown.length) % shown.length;
    list.querySelectorAll(".cmdk__item").forEach((el, n) => el.setAttribute("aria-selected", String(n === sel)));
    const el = document.getElementById(`cmdk-opt-${sel}`);
    input.setAttribute("aria-activedescendant", `cmdk-opt-${sel}`);
    if (el && scroll) el.scrollIntoView({ block: "nearest" });
  }

  function render() {
    const q = input.value.trim();
    shown = items
      .map(it => ({ it, s: score(q, `${it.label} ${it.hint || ""}`) }))
      .filter(x => x.s > 0)
      .sort((a, b) => (q ? b.s - a.s : 0))
      .map(x => x.it)
      .slice(0, 40);

    list.innerHTML = "";
    if (!shown.length) {
      const li = document.createElement("li");
      li.className = "cmdk__empty"; li.setAttribute("role", "presentation");
      li.textContent = "No matches";
      list.appendChild(li);
      input.removeAttribute("aria-activedescendant");
      return;
    }
    let lastGroup = null;
    shown.forEach((it, i) => {
      if (!q && it.group !== lastGroup) {
        const g = document.createElement("li");
        g.className = "cmdk__group"; g.setAttribute("role", "presentation");
        g.textContent = it.group;
        list.appendChild(g);
        lastGroup = it.group;
      }
      const li = document.createElement("li");
      li.id = `cmdk-opt-${i}`;
      li.className = "cmdk__item";
      li.setAttribute("role", "option");
      const label = document.createElement("span"); label.textContent = it.label;
      const hint  = document.createElement("small"); hint.textContent = it.hint || "";
      li.append(label, hint);
      li.addEventListener("mousemove", () => { if (sel !== i) setSel(i, false); });
      li.addEventListener("click", () => exec(i));
      list.appendChild(li);
    });
    setSel(0);
  }

  function open() {
    if (overlay.classList.contains("open")) return;
    buildItems();
    input.value = "";
    lastFocus = document.activeElement;
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    render();
    input.focus();
  }

  function close() {
    if (!overlay.classList.contains("open")) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = prevOverflow;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function exec(i) {
    const it = shown[i];
    if (!it) return;
    close();
    setTimeout(() => it.run(), 0);
  }

  input.addEventListener("input", render);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown")      { e.preventDefault(); setSel(sel + 1); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setSel(sel - 1); }
    else if (e.key === "Enter")     { e.preventDefault(); exec(sel); }
    else if (e.key === "Escape")    { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Tab")       { e.preventDefault(); }
  });
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(); });
  if (openBtn) openBtn.addEventListener("click", () => (overlay.classList.contains("open") ? close() : open()));

  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      overlay.classList.contains("open") ? close() : open();
    }
  });
}

async function loadJourneyProjects() {
  try {
    const data = await getGitHubData();
    if (data.top.length && galaxy) galaxy.setProjects(data.top.map(repoToPayload), data.summary);
    else if (galaxy) galaxy.setProjects(J.projects, data.summary);   // no repos with descriptions: keep fallback planets, show the stats
  } catch (err) {
    console.warn("Journey is using the built-in project list:", err);
  }
}

/* =========================================================
   Init
   ========================================================= */
document.getElementById("year").textContent = new Date().getFullYear();

prepareHeroChars();
// initF1Car();   // old background - re-enable (and remove the display:none in styles.css) to bring the car back
initHeroGalaxy();
initCardReactions();

if (!location.hash) history.replaceState(null, "", "#/");
navigate();

const metaReady = loadProjectMeta();
metaReady.then(loadProjects);
metaReady.then(loadJourneyProjects);
initGitHubInsights();
initTerminal();
initCommandPalette();;