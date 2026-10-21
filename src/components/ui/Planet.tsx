import "../../styles/planet.css";

export type PlanetVariant = "striped" | "spotted" | "ringed";
export type PlanetSize = "sm" | "md";

interface PlanetProps {
  variant?: PlanetVariant;
  size?: PlanetSize;
}

/**
  The React twin of Planet.astro. An Astro component cannot render inside a
  React island, so the carousel uses this one. Keep the markup in sync.
*/

// A wave is four identical 50-unit periods, so 200 units. Its texture loops every 100.
const wave = (y: number, amplitude: number): string =>
  `M0 ${y} c12.5 ${-amplitude} 37.5 ${amplitude} 50 0 s37.5 ${amplitude} 50 0 s37.5 ${amplitude} 50 0 s37.5 ${amplitude} 50 0`;

const STRIPES = [
  { y: 24, className: "planet-band-a", width: 8 },
  { y: 48, className: "planet-band-b", width: 5 },
  { y: 72, className: "planet-band-a", width: 8 },
];

const RINGED_BANDS = [
  { y: 34, className: "planet-band-b", width: 3 },
  { y: 50, className: "planet-band-a", width: 2.5 },
  { y: 66, className: "planet-band-b", width: 3 },
];

// Craters are drawn in the first 100 units and copied at +100, so the texture repeats cleanly.
const CRATERS = [
  { x: 28, y: 34, r: 11, className: "planet-spot-a" },
  { x: 66, y: 60, r: 14, className: "planet-spot-a" },
  { x: 86, y: 18, r: 6, className: "planet-spot-a" },
  { x: 34, y: 28, r: 4, className: "planet-spot-b" },
  { x: 72, y: 52, r: 5, className: "planet-spot-b" },
  { x: 80, y: 16, r: 2.5, className: "planet-spot-b" },
];

const RING_TILT = "rotate(-18 50 50)";

export function Planet({ variant = "striped", size = "sm" }: PlanetProps) {
  return (
    <span className="planet" data-variant={variant} data-size={size} aria-hidden="true">
      {variant === "ringed" && (
        <svg className="planet-svg" viewBox="0 0 100 100" focusable="false">
          <g transform={RING_TILT}>
            <ellipse cx="50" cy="50" rx="48" ry="13" className="planet-ring-line" />
          </g>
        </svg>
      )}
      <span className="planet-body">
        <svg className="planet-texture" viewBox="0 0 200 100" focusable="false">
          {variant === "striped" &&
            STRIPES.map((band) => (
              <path key={band.y} d={wave(band.y, 7)} className={band.className} strokeWidth={band.width} />
            ))}
          {variant === "ringed" &&
            RINGED_BANDS.map((band) => (
              <path key={band.y} d={wave(band.y, 4)} className={band.className} strokeWidth={band.width} />
            ))}
          {variant === "spotted" &&
            CRATERS.flatMap((crater) =>
              [0, 100].map((dx) => (
                <circle
                  key={`${crater.x}-${crater.y}-${dx}`}
                  cx={crater.x + dx}
                  cy={crater.y}
                  r={crater.r}
                  className={crater.className}
                />
              )),
            )}
        </svg>
        <svg className="planet-shade" viewBox="0 0 100 100" focusable="false">
          <defs>
            <radialGradient id="planet-shade" cx="30%" cy="28%" r="85%">
              <stop offset="0" className="stop-hi" />
              <stop offset="0.45" className="stop-clear" />
              <stop offset="0.8" className="stop-soft" />
              <stop offset="1" className="stop-dark" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill="url(#planet-shade)" />
        </svg>
      </span>
      {variant === "ringed" && (
        <svg className="planet-svg" viewBox="0 0 100 100" focusable="false">
          <g transform={RING_TILT}>
            <path d="M2 50 A48 13 0 0 0 98 50" className="planet-ring-line" />
          </g>
        </svg>
      )}
    </span>
  );
}
