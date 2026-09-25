import type { SavedDisplay, SavedWindow } from '@magwin/core';
import type { ReactNode } from 'react';
import './layoutPreview.css';

export interface LayoutPreviewProps {
  readonly displays: readonly SavedDisplay[];
  readonly windows: readonly SavedWindow[];
  /** Compact thumbnails for lists. */
  readonly compact?: boolean;
}

interface DesktopGroup {
  readonly key: string;
  readonly label: string;
  readonly display: SavedDisplay | undefined;
  readonly windows: readonly SavedWindow[];
}

/** Unknown desktops sort last. */
function desktopRank(key: string): number {
  return key === '?' ? Number.MAX_SAFE_INTEGER : Number(key);
}

function groups(props: LayoutPreviewProps): DesktopGroup[] {
  const byKey = new Map<string, SavedWindow[]>();
  for (const window of props.windows) {
    const key = window.desktop === null ? '?' : String(window.desktop.number);
    byKey.set(key, [...(byKey.get(key) ?? []), window]);
  }
  return [...byKey.entries()]
    .sort(([a], [b]) => desktopRank(a) - desktopRank(b))
    .map(([key, windows]) => ({
      key,
      label: key === '?' ? 'Desktop ?' : `Desktop ${key}`,
      display: props.displays.find((d) => d.uuid === windows[0]?.displayUuid),
      windows,
    }));
}

/** Stable colour per app so the same app looks the same on every desktop. */
export function appHue(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Wireframe of a layout, one miniature screen per desktop, like Mission Control's space bar.
 * Rectangles instead of screenshots: no Screen Recording permission, nothing private leaks.
 */
export function LayoutPreview(props: LayoutPreviewProps): ReactNode {
  return (
    <div className={`layout-preview${props.compact === true ? ' compact' : ''}`}>
      {groups(props).map((group) => {
        const frame = group.display?.visibleFrame;
        const ratio = frame === undefined ? 16 / 10 : frame.width / frame.height;
        const ordered = [...group.windows].sort((a, b) => b.order - a.order);
        return (
          <figure key={group.key} className="desktop">
            <div className="screen" style={{ aspectRatio: String(ratio) }}>
              {ordered.map((window) => {
                const rel = window.relativeFrame;
                const left = clamp01(rel.x);
                const top = clamp01(rel.y);
                return (
                  <div
                    key={`${String(window.order)}-${window.app.name}`}
                    className="window"
                    title={window.title ?? window.app.name}
                    style={{
                      left: `${String(left * 100)}%`,
                      top: `${String(top * 100)}%`,
                      width: `${String(clamp01(rel.width) * 100)}%`,
                      height: `${String(clamp01(rel.height) * 100)}%`,
                      ['--hue' as string]: String(appHue(window.app.name)),
                    }}
                  >
                    <span>{window.app.name}</span>
                  </div>
                );
              })}
            </div>
            <figcaption>{group.label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
