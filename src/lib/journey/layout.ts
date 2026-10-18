/*
  Where things sit along the scroll journey.

  Positions are measured in "screens": s = 1 means one screen height of
  scrolling past the top of the journey track.
*/

/** The galaxy has opened up and the camera pauses. */
export const INTRO_S = 1.4;
/** Scroll position of the first planet. */
export const FIRST_PLANET_S = 2.7;
/** Screens of scrolling between one planet and the next. */
export const PLANET_STEP = 1.0;
/** Screens between the last planet and the closing stop. */
export const OUT_PAD = 1.5;

export type ChapterKind = "hero" | "intro" | "planet" | "out";

export interface Chapter {
  kind: ChapterKind;
  /** Scroll position where this chapter is centred. */
  s: number;
  /** Planet number, for kind "planet" only. */
  planet?: number;
}

export interface JourneyLayout {
  planetCount: number;
  chapters: readonly Chapter[];
  /** Last scroll position the camera cares about. */
  sOut: number;
  /** Height of the whole track in screens: one screen past sOut so the last stop can be reached. */
  totalScreens: number;
}

export const planetScroll = (index: number): number => FIRST_PLANET_S + index * PLANET_STEP;

export function journeyLayout(planetCount: number): JourneyLayout {
  const count = Math.max(0, Math.floor(planetCount));
  const sOut = (count > 0 ? planetScroll(count - 1) : INTRO_S) + OUT_PAD;
  const chapters: Chapter[] = [
    { kind: "hero", s: 0 },
    { kind: "intro", s: INTRO_S },
  ];
  for (let i = 0; i < count; i += 1) chapters.push({ kind: "planet", s: planetScroll(i), planet: i });
  chapters.push({ kind: "out", s: sOut });
  return { planetCount: count, chapters, sOut, totalScreens: sOut + 1 };
}

/** The chapter whose centre is closest to scroll position s. */
export function nearestChapter(layout: JourneyLayout, s: number): Chapter {
  let best = layout.chapters[0] as Chapter;
  let bestDistance = Infinity;
  for (const chapter of layout.chapters) {
    const distance = Math.abs(s - chapter.s);
    if (distance < bestDistance) {
      best = chapter;
      bestDistance = distance;
    }
  }
  return best;
}