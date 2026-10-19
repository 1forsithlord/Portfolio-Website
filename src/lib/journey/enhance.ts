import { clamp } from "../galaxy/math";
import { SETTLED_ROTATE } from "../galaxy/motion";
import { startGalaxy } from "../galaxy/controller";
import { makePlanets } from "../galaxy/planets";
import { chapterVisibility, journeyLayout } from "./layout";
import type { JourneyLayout } from "./layout";
import { planetOnScreen } from "./screen";
import { createJourneyStore } from "./store";
import { planetAmount } from "./timeline";

/**
  Wires the home page journey: the scroll store, the galaxy camera, the chapter
  cards, the planet name tags and the chapter rail. The markup lives in
  index.astro and is found by data attributes.

  Returns a cleanup function. Returns null when the galaxy cannot run (no
  WebGL). The page then shows the chapters as a plain stacked list.
*/
export function enhanceHomeJourney(root: HTMLElement): (() => void) | null {
  const track = root.querySelector<HTMLElement>("[data-track]");
  const galaxyEl = root.querySelector<HTMLElement>("[data-galaxy]");
  const cardEls = Array.from(root.querySelectorAll<HTMLElement>("[data-chapter]"));
  const railEls = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-rail-item]"));
  const tagEls = Array.from(root.querySelectorAll<HTMLElement>("[data-planet-tag]"));
  const cue = root.querySelector<HTMLElement>("[data-cue]");
  if (!track || !galaxyEl) return null;

  const layout: JourneyLayout = journeyLayout(Number(root.dataset.planets ?? "0"));
  if (cardEls.length !== layout.chapters.length || railEls.length !== layout.chapters.length) {
    console.error("Journey markup does not match the layout. Showing the stacked list.");
    return null;
  }
  const planets = makePlanets(layout.planetCount);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  layout.chapters.forEach((chapter, i) => {
    cardEls[i]?.style.setProperty("--s", String(chapter.s));
  });
  root.dataset.mode = "enhanced";

  const store = createJourneyStore({ track, layout });
  const galaxy = startGalaxy({ container: galaxyEl, journey: { store, layout } });
  if (!galaxy) {
    store.destroy();
    root.dataset.mode = "stacked";
    return null;
  }

  const unbind = railEls.map((el, i) => {
    const onClick = () => {
      const chapter = layout.chapters[i];
      if (chapter) store.scrollToS(chapter.s);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  });

  let raf = 0;
  let current = -1;

  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    const { s } = store.getSnapshot();
    const { camera, rotate } = galaxy.status();
    // Under reduced motion the galaxy draws its still frame at SETTLED_ROTATE, so the tags must agree with it.
    const t = motion.matches ? SETTLED_ROTATE : rotate;
    const width = window.innerWidth;
    const height = window.innerHeight;

    let nearest = 0;
    let nearestDistance = Infinity;
    layout.chapters.forEach((chapter, i) => {
      const card = cardEls[i];
      if (!card) return;
      const visible = chapterVisibility(s, chapter.s);
      card.style.opacity = visible.toFixed(3);
      card.inert = visible === 0;
      const distance = Math.abs(s - chapter.s);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });

    if (nearest !== current) {
      current = nearest;
      railEls.forEach((el, i) => {
        if (i === nearest) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      });
    }

    const amount = planetAmount(s);
    for (const el of tagEls) {
      const index = Number(el.dataset.planetTag);
      const planet = planets[index];
      const chapter = layout.chapters[index + 1];
      if (!planet || !chapter) continue;
      const point = planetOnScreen(planet, t, camera, width, height);
      const alpha = chapterVisibility(s, chapter.s) * amount;
      const show = point.visible && alpha > 0.01;
      el.style.opacity = show ? alpha.toFixed(3) : "0";
      el.style.pointerEvents = show ? "auto" : "none";
      el.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0) translate(-50%, 1.1rem)`;
    }

    if (cue) cue.style.opacity = clamp(1 - s / 0.05, 0, 1).toFixed(3);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    unbind.forEach((off) => off());
    galaxy.destroy();
    store.destroy();
  };
}