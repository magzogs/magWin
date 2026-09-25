/**
 * Geometry primitives in global screen points.
 * Origin is the top-left corner of the main display and y grows downward, which is the
 * convention shared by Quartz (CGWindowList, Accessibility) and Electron's `screen` module.
 * See docs/docs/architecture/coordinates.md.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function rectRight(r: Rect): number {
  return r.x + r.width;
}

export function rectBottom(r: Rect): number {
  return r.y + r.height;
}

/** Inclusive on every edge so that points exactly on a border count as inside. */
export function containsPoint(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= rectRight(r) && p.y >= r.y && p.y <= rectBottom(r);
}

export function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 };
}

export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(rectRight(a), rectRight(b)) - x,
    height: Math.max(rectBottom(a), rectBottom(b)) - y,
  };
}

export function intersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(rectRight(a), rectRight(b));
  const bottom = Math.min(rectBottom(a), rectBottom(b));
  if (right <= x || bottom <= y) {
    return null;
  }
  return { x, y, width: right - x, height: bottom - y };
}

export function area(r: Rect): number {
  return Math.max(0, r.width) * Math.max(0, r.height);
}

/** Intersection over union, 0 when the rectangles do not overlap. */
export function overlapRatio(a: Rect, b: Rect): number {
  const shared = intersection(a, b);
  if (shared === null) {
    return 0;
  }
  const sharedArea = area(shared);
  return sharedArea / (area(a) + area(b) - sharedArea);
}

export function center(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Moves `r` inside `bounds`; if `r` is larger than `bounds` it is shrunk to fit. */
export function clampRectInto(r: Rect, bounds: Rect): Rect {
  const width = Math.min(r.width, bounds.width);
  const height = Math.min(r.height, bounds.height);
  const x = Math.min(Math.max(r.x, bounds.x), rectRight(bounds) - width);
  const y = Math.min(Math.max(r.y, bounds.y), rectBottom(bounds) - height);
  return { x, y, width, height };
}

/** Expresses `r` as fractions (0..1) of `frame`. */
export function toRelative(r: Rect, frame: Rect): Rect {
  return {
    x: (r.x - frame.x) / frame.width,
    y: (r.y - frame.y) / frame.height,
    width: r.width / frame.width,
    height: r.height / frame.height,
  };
}

/** Inverse of {@link toRelative}. */
export function fromRelative(rel: Rect, frame: Rect): Rect {
  return {
    x: frame.x + rel.x * frame.width,
    y: frame.y + rel.y * frame.height,
    width: rel.width * frame.width,
    height: rel.height * frame.height,
  };
}

export function roundRect(r: Rect): Rect {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  return { x, y, width: Math.round(rectRight(r)) - x, height: Math.round(rectBottom(r)) - y };
}

export function rectsEqual(a: Rect, b: Rect, tolerance = 0): boolean {
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}

export function sameSize(a: Rect, b: Rect): boolean {
  return a.width === b.width && a.height === b.height;
}
