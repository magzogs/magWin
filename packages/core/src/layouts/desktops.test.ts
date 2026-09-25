import { describe, expect, it } from 'vitest';
import { topology } from '../test/fixtures';
import { buildDesktopCatalog, desktopForSpaces, fullscreenSpaceIds } from './desktops';

describe('buildDesktopCatalog', () => {
  const catalog = buildDesktopCatalog(topology);

  it('numbers desktops globally across displays and skips full-screen spaces', () => {
    expect(catalog.map((d) => [d.spaceId, d.number, d.indexOnDisplay, d.position])).toEqual([
      [1, 1, 1, 0],
      [7, 2, 2, 2],
      [9, 3, 1, 0],
    ]);
  });

  it('marks the current desktop of every display', () => {
    expect(catalog.filter((d) => d.isCurrent).map((d) => d.spaceId)).toEqual([1, 9]);
  });

  it('treats an empty space uuid as missing', () => {
    expect(catalog[0]?.spaceUuid).toBeNull();
    expect(catalog[1]?.spaceUuid).toBe('D2-UUID');
  });

  it('finds full-screen spaces and resolves window spaces to desktops', () => {
    expect([...fullscreenSpaceIds(topology)]).toEqual([50]);
    expect(desktopForSpaces(catalog, [50, 7])?.number).toBe(2);
    expect(desktopForSpaces(catalog, [999])).toBeUndefined();
  });
});
