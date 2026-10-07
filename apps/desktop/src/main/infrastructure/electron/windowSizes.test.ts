import { describe, expect, it } from 'vitest';
import { MAIN_WINDOW_WIDTH, mainWindowSizeOptions } from './windowSizes';

describe('mainWindowSizeOptions', () => {
  it('fixes the width and leaves only the height resizable', () => {
    const options = mainWindowSizeOptions();
    expect(options.width).toBe(MAIN_WINDOW_WIDTH);
    expect(options.minWidth).toBe(MAIN_WINDOW_WIDTH);
    expect(options.maxWidth).toBe(MAIN_WINDOW_WIDTH);
    expect(options.resizable).toBe(true);
    expect(options.maxHeight).toBeUndefined();
    expect(options.minHeight).toBeLessThan(options.height ?? 0);
  });

  it('disables full screen and zoom, which would change the width', () => {
    expect(mainWindowSizeOptions()).toMatchObject({ maximizable: false, fullscreenable: false });
  });
});
