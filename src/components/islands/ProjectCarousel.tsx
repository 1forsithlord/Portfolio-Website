import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Project } from "../../content/projects";
import "../../styles/carousel.css";

/** Cards further than this from the centre are hidden, so only five ever draw. */
const MAX_OFFSET = 2;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const pad = (n: number): string => String(n).padStart(2, "0");

type Mode = "browse" | "detail";

interface ProjectCarouselProps {
  projects: readonly Project[];
}

/**
  A horizontal carousel of glass cards. Browse mode scrolls with CSS scroll-snap;
  JavaScript only turns the scroll position into the 3D pose of each card.
  Activating the centred card expands it in place. Escape or Close returns to browse.
  No autoplay, no looping, no carousel library.
*/
export function ProjectCarousel({ projects }: ProjectCarouselProps) {
  const [mode, setMode] = useState<Mode>("browse");
  const [index, setIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const count = projects.length;

  /** Distance between two neighbouring slots, in pixels: slot width plus the gap. */
  const stepPx = (): number => {
    const track = trackRef.current;
    const first = track?.querySelector<HTMLElement>(".slot");
    if (!track || !first) return 0;
    return first.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
  };

  const scrollToIndex = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: target * stepPx(), behavior: reduced ? "auto" : "smooth" });
  };

  const go = (target: number) => {
    const next = clamp(target, 0, count - 1);
    setIndex(next);
    scrollToIndex(next);
  };

  // Browse: turn the scroll position into a fractional position for the 3D pose.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || mode !== "browse") return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const step = stepPx();
      if (step <= 0) return;
      const next = clamp(track.scrollLeft / step, 0, Math.max(count - 1, 0));
      setPosition(next);
      setIndex(Math.round(next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mode, count]);

  // Returning from detail: the track has just been created at scroll 0, so put it back on the card.
  useLayoutEffect(() => {
    if (mode !== "browse") return;
    const track = trackRef.current;
    if (track) track.scrollLeft = index * stepPx();
  }, [mode]);

  // Focus follows the mode: the heading when expanded, the card when collapsed.
  useEffect(() => {
    if (mode === "detail") {
      headingRef.current?.focus();
    } else {
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-slot="${index}"]`)?.focus({ preventScroll: true });
    }
  }, [mode]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (mode === "detail") {
      if (event.key === "Escape") {
        event.preventDefault();
        setMode("browse");
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };

  if (count === 0) return null;

  if (mode === "detail") {
    const project = projects[index];
    if (!project) return null;
    return (
      <div ref={rootRef} className="carousel" data-mode="detail" role="region" aria-roledescription="carousel" aria-label="Featured projects" onKeyDown={onKeyDown}>
        <article className="detail" aria-labelledby="detail-title">
          <div className="surface detail-surface">
            <p className="index">
              {pad(index + 1)} / {pad(count)}
            </p>
            <h2 id="detail-title" className="title" ref={headingRef} tabIndex={-1}>
              {project.title}
            </h2>
            <p className="detail-summary">{project.summary}</p>
            <ul className="stack" aria-label="Tech stack">
              {project.stack.map((item) => (
                <li key={item} className="chip-tag">
                  {item}
                </li>
              ))}
            </ul>
            <div className="actions">
              <a className="link-button primary" href={`/projects/${project.slug}`}>
                Case study
              </a>
              {project.repoUrl && (
                <a className="link-button" href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                  Source
                </a>
              )}
              {project.demoUrl && (
                <a className="link-button" href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                  Live demo
                </a>
              )}
              <button type="button" className="link-button" onClick={() => setMode("browse")}>
                Close
              </button>
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="carousel" data-mode="browse" role="region" aria-roledescription="carousel" aria-label="Featured projects" onKeyDown={onKeyDown}>
      <div ref={trackRef} className="track">
        {projects.map((project, i) => {
          const distance = i - position;
          const offset = clamp(distance, -MAX_OFFSET, MAX_OFFSET);
          const amount = Math.abs(offset);
          const hidden = Math.abs(distance) > MAX_OFFSET;
          return (
            <div
              key={project.slug}
              className="slot"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              inert={hidden}
              style={{
                transform: `perspective(90rem) rotateY(${(-offset * 22).toFixed(2)}deg) translateZ(${(-amount * 4).toFixed(2)}rem) scale(${(1 - amount * 0.08).toFixed(3)})`,
                opacity: hidden ? 0 : 1 - amount * 0.25,
              }}
            >
              <button
                type="button"
                className="face-button"
                data-slot={i}
                aria-current={i === index ? "true" : undefined}
                aria-label={i === index ? `Open ${project.title}` : `Show ${project.title}`}
                onClick={() => (i === index ? setMode("detail") : go(i))}
              >
                <span className="surface">
                  <span className="index">
                    {pad(i + 1)} / {pad(count)}
                  </span>
                  <span className="title">{project.title}</span>
                  <span className="summary">{project.summary}</span>
                  <span className="hint">{i === index ? "Expand" : "Show"}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="controls">
        <button
          type="button"
          className="nav-button"
          onClick={() => go(index - 1)}
          disabled={index <= 0}
          aria-label="Previous project"
        >
          ←
        </button>
        <p className="position" aria-live="polite">
          {pad(index + 1)} / {pad(count)}
        </p>
        <button
          type="button"
          className="nav-button"
          onClick={() => go(index + 1)}
          disabled={index >= count - 1}
          aria-label="Next project"
        >
          →
        </button>
      </div>
    </div>
  );
}