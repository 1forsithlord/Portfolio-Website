/** Marks a value the owner still has to supply. Never invent content. */
export const UNKNOWN = "UNKNOWN — needs input";

export interface Project {
  /** URL-safe id, used for /projects/[slug]. Must be unique. */
  slug: string;
  title: string;
  /** One or two sentences. */
  summary: string;
  stack: readonly string[];
  /** Shown first and treated as a case study. */
  featured: boolean;
  /** Full GitHub repository URL, or null until it is filled in. */
  repoUrl: string | null;
  /** Live demo URL, or null. */
  demoUrl: string | null;
  /** YouTube video id for a demo, or null. */
  videoId: string | null;
  /** Optional metrics to show on the project card. */
  metrics?: readonly string[];
}

export const projects: readonly Project[] = [
  {
    slug: "zero-lora",
    title: "Zero-LoRA",
    summary:
      "Similarity-drift-regularized LoRA adaptation of CLIP ViT-B/16 for zero-shot retention. Investigating whether raw image-text similarity-geometry regularization improves the trade-off between downstream task accuracy and zero-shot retention.",
    stack: ["CLIP", "LoRA", "Continual learning", "Python", "PyTorch"],
    featured: true,
    repoUrl: "https://github.com/1forsithlord/zero-lora",
    demoUrl: null,
    videoId: null,
  },
  {
    slug: "product-master",
    title: "Product-Master",
    summary:
      "A PHP + MariaDB catalogue app with a single-page dashboard: category filters, pagination, an Add/Edit modal, image upload, and soft-delete.",
    stack: ["PHP", "MariaDB", "JavaScript"],
    featured: true,
    repoUrl: "https://github.com/1forsithlord/Product-Master",
    demoUrl: null,
    videoId: null,
  },
  {
    slug: "water-reminder",
    title: "Water reminder",
    summary:
      "A Spider-Man-themed macOS water reminder in Go and Objective-C, forked from an open-source project and customised with a delay slider.",
    stack: ["Go", "Objective-C", "macOS"],
    featured: true,
    repoUrl: "https://github.com/1forsithlord/yash-water-reminder",
    demoUrl: null,
    videoId: null,
  },
  {
    slug: "rasengan-x-chidori",
    title: "rasengan-x-chidori",
    summary:
      "A real-time hand-tracking effects app inspired by the Rasengan and Chidori from Naruto, built in the browser with hand tracking and canvas effects.",
    stack: ["JavaScript", "Hand tracking", "Canvas"],
    featured: true,
    repoUrl: "https://github.com/1forsithlord/rasengan-x-chidori",
    demoUrl: null,
    videoId: null,
  },
  {
    slug: "finsense",
    title: "FinSense",
    summary:
      "An AI-based expense tracker built as an academic project, exploring an end-to-end multi-model pipeline for multimodal expense intelligence.",
    stack: ["Multimodal", "Expense intelligence"],
    featured: false,
    repoUrl: null,
    demoUrl: null,
    videoId: null,
  },
  {
    slug: "saarthi",
    title: "SAARTHI",
    summary:
      "A real-time dead-reckoning engine that ensures navigation when GPS fails. Fuses smartphone IMU data with a Causal Transformer, EKF, and OSM to achieve sub-3 km/h speed error and 5.6° heading error in blind, GNSS-denied environments.",
    stack: ["PyTorch", "Causal Transformer", "EKF", "Sensor Fusion", "OpenStreetMap"],
    metrics: ["2.37 km/h Speed Error", "5.6° Heading Error", "SIH 2026 Finalist"],
    featured: true,
    repoUrl: "https://github.com/1forsithlord/AI-Intelligent-Dead-Reckoning",
    demoUrl: null,
    videoId: null,
  },
  {
    slug: "pygame-chess",
    title: "Pygame chess",
    summary: "A chess game written in Python and Pygame.",
    stack: ["Python", "Pygame"],
    featured: false,
    repoUrl: null,
    demoUrl: null,
    videoId: null,
  },
];

const seen = new Set<string>();
for (const project of projects) {
  if (seen.has(project.slug)) {
    throw new Error(`Duplicate project slug: ${project.slug}`);
  }
  seen.add(project.slug);
}
