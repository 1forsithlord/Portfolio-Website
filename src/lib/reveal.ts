/** True when the user asks the system to reduce motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
  Fades and lifts every [data-reveal] element into place when it scrolls into view.
  The hidden state only applies once this has run, so without JavaScript everything stays visible.
*/
export function enableReveals(root: ParentNode = document): void {
  const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  if (items.length === 0) return;

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }

  document.documentElement.classList.add("reveal-ready");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
  );
  items.forEach((el) => observer.observe(el));
}
