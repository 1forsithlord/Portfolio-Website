import { clamp } from "../galaxy/math";
import type { JourneyLayout } from "./layout";

export interface JourneySnapshot {
  /** Smoothed scroll position in screens. The camera follows this. */
  readonly s: number;
  /** Where the page is actually scrolled to, in screens. */
  readonly target: number;
}

export interface JourneyStore {
  /** The same object is returned until something changes. Works with React's useSyncExternalStore. */
  getSnapshot(): JourneySnapshot;
  subscribe(listener: () => void): () => void;
  /** Ease s toward the scroll position. Call once per frame. */
  step(dtSec: number): void;
  /** Jump s straight to the scroll position. */
  snap(): void;
  /** True while s is still catching up or the page was scrolled a moment ago. */
  moving(): boolean;
  /** Scroll the page so the journey is at position s. */
  scrollToS(s: number): void;
  destroy(): void;
}

export interface JourneyStoreOptions {
  /** The tall element whose scrolling drives the journey. */
  track: HTMLElement;
  layout: JourneyLayout;
}

/** How fast s catches up with the scroll position. Higher is snappier. */
const CATCH_UP = 7;
const SETTLE_EPSILON = 0.0005;
/** Milliseconds after a scroll event during which the store still counts as moving. */
const RECENT_SCROLL_MS = 250;

export function createJourneyStore({ track, layout }: JourneyStoreOptions): JourneyStore {
  const maxS = layout.sOut;
  // CSS sizes the track: height: calc(var(--journey-screens) * 100lvh).
  track.style.setProperty("--journey-screens", String(layout.totalScreens));

  const listeners = new Set<() => void>();
  let lastScrollAt = Number.NEGATIVE_INFINITY;

  /** One screen of the track in pixels, from the track itself so a moving mobile toolbar cannot change it. */
  function unit(): number {
    const height = track.offsetHeight;
    return height > 0 ? height / layout.totalScreens : window.innerHeight;
  }

  function readTarget(): number {
    return clamp(-track.getBoundingClientRect().top / unit(), 0, maxS);
  }

  let target = readTarget();
  let s = target;
  let snapshot: JourneySnapshot = { s, target };

  function emit(): void {
    snapshot = { s, target };
    for (const listener of listeners) listener();
  }

  function onScroll(): void {
    const next = readTarget();
    if (next === target) return;
    target = next;
    lastScrollAt = performance.now();
    emit();
  }

  const resizeObserver = new ResizeObserver(onScroll);
  resizeObserver.observe(track);
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    step(dtSec) {
      const gap = target - s;
      if (Math.abs(gap) < SETTLE_EPSILON) {
        if (s !== target) {
          s = target;
          emit();
        }
        return;
      }
      s += gap * (1 - Math.exp(-dtSec * CATCH_UP));
      emit();
    },
    snap() {
      if (s === target) return;
      s = target;
      emit();
    },
    moving() {
      return Math.abs(target - s) > SETTLE_EPSILON || performance.now() - lastScrollAt < RECENT_SCROLL_MS;
    },
    scrollToS(position) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const top = track.getBoundingClientRect().top + window.scrollY + clamp(position, 0, maxS) * unit();
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    },
    destroy() {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      listeners.clear();
    },
  };
}
