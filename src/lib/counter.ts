import { prefersReducedMotion } from "@/lib/reveal";

const format = (n: number): string => Math.round(n).toLocaleString("en-US");

/** Reads a duration token such as "700ms" so the script follows the same token as the CSS. */
function tokenMs(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith("ms") ? value : value * 1000;
}

function countUp(el: HTMLElement, target: number, duration: number): void {
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    el.textContent = format(target * eased);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
  Counts [data-count-to] elements up from 0 when they come into view.
  The server-rendered number is already the final value, so with reduced motion,
  or without JavaScript, the page shows the real number straight away.
*/
export function animateCounters(root: ParentNode = document): void {
  const duration = tokenMs("--duration-scene");
  if (prefersReducedMotion() || duration === 0 || !("IntersectionObserver" in window)) return;

  const targets = new Map<HTMLElement, number>();
  for (const el of root.querySelectorAll<HTMLElement>("[data-count-to]")) {
    const target = Number(el.dataset.countTo);
    if (!Number.isFinite(target)) continue;
    targets.set(el, target);
    el.textContent = format(0);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const target = targets.get(el);
        observer.unobserve(el);
        if (target !== undefined) countUp(el, target, duration);
      }
    },
    { threshold: 0.5 },
  );
  targets.forEach((_, el) => observer.observe(el));
}
