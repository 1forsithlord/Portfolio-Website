export type TierName = "high" | "medium" | "low";

export interface Tier {
  name: TierName;
  /** Galaxy particle budget. */
  particles: number;
  /** Background star budget. */
  stars: number;
  /** Highest device pixel ratio the canvas is rendered at. */
  dprCap: number;
}

export const TIERS: Record<TierName, Tier> = {
  high: { name: "high", particles: 130000, stars: 9000, dprCap: 1.5 },
  medium: { name: "medium", particles: 60000, stars: 6000, dprCap: 1.25 },
  low: { name: "low", particles: 30000, stars: 3000, dprCap: 1 },
};

/** The next cheaper tier, or null when already on the cheapest. */
export function lowerTier(name: TierName): TierName | null {
  if (name === "high") return "medium";
  if (name === "medium") return "low";
  return null;
}

export interface TierEnv {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Logical cores, when the browser says. */
  cores: number | undefined;
  /** Device memory in GB, when the browser says (Chromium only). */
  memoryGb: number | undefined;
  /** The user asked the browser to save data. */
  saveData: boolean;
}

export function readTierEnv(): TierEnv {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    width: window.innerWidth,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData === true,
  };
}

/**
  First guess only. These thresholds are a starting point, not measured.
  The controller measures real frame times and steps down if they are slow.
*/
export function pickTier(env: TierEnv): TierName {
  if (env.saveData) return "low";
  if (env.cores !== undefined && env.cores <= 2) return "low";
  if (env.memoryGb !== undefined && env.memoryGb <= 2) return "low";
  if (env.width < 700) return "medium";
  if (env.cores !== undefined && env.cores <= 4) return "medium";
  if (env.memoryGb !== undefined && env.memoryGb <= 4) return "medium";
  return "high";
}
