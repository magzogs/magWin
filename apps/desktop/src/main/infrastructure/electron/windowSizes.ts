import type { BrowserWindowConstructorOptions } from 'electron';

/** Width that fits the settings sidebar plus a comfortable content column. */
export const MAIN_WINDOW_WIDTH = 900;

/**
 * Size limits of the main window. The width is fixed (min = max) so the centered content never
 * reflows; only the height can be dragged. Full screen and zoom would break the fixed width.
 */
export function mainWindowSizeOptions(): BrowserWindowConstructorOptions {
  return {
    width: MAIN_WINDOW_WIDTH,
    height: 720,
    minWidth: MAIN_WINDOW_WIDTH,
    maxWidth: MAIN_WINDOW_WIDTH,
    minHeight: 520,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
  };
}
