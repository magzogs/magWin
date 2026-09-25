import { describe, expect, it } from 'vitest';
import { FakeClock, MemoryLayoutRepository } from '../test/fakes';
import { layoutOf, saved } from '../test/world';
import { LayoutLibrary } from './LayoutLibrary';

function layout(id: string, createdAt: string) {
  return { ...layoutOf([saved({ number: 1 })], `Layout ${id}`), id, createdAt };
}

describe('LayoutLibrary', () => {
  it('loads saved order first, then unknown layouts by creation time', async () => {
    const repository = new MemoryLayoutRepository();
    await repository.save(layout('a', '2026-01-01'));
    await repository.save(layout('b', '2026-01-02'));
    await repository.save(layout('c', '2026-01-03'));
    repository.order = ['c', 'missing'];
    const library = new LayoutLibrary(repository, new FakeClock());
    await library.load();
    expect(library.summaries().map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(library.atSlot(0)?.id).toBe('c');
  });

  it('appends new layouts so existing hotkey slots stay stable', async () => {
    const repository = new MemoryLayoutRepository();
    const library = new LayoutLibrary(repository, new FakeClock());
    await library.load();
    const seen: string[][] = [];
    library.onChange((summaries) => seen.push(summaries.map((s) => s.id)));
    await library.add(layout('a', '2026-01-01'));
    await library.add(layout('b', '2026-01-02'));
    expect(repository.order).toEqual(['a', 'b']);
    expect(seen).toEqual([['a'], ['a', 'b']]);
  });

  it('renames, reorders and removes', async () => {
    const clock = new FakeClock(Date.parse('2026-09-25T12:00:00.000Z'));
    const repository = new MemoryLayoutRepository();
    const library = new LayoutLibrary(repository, clock);
    await library.add(layout('a', '2026-01-01'));
    await library.add(layout('b', '2026-01-02'));

    expect((await library.rename('a', 'Design')).ok).toBe(true);
    expect(library.get('a')?.name).toBe('Design');
    expect(library.get('a')?.updatedAt).toBe('2026-09-25T12:00:00.000Z');

    await library.move('b', 'up');
    expect(library.summaries().map((s) => s.id)).toEqual(['b', 'a']);
    await library.move('b', 'up');
    expect(library.summaries().map((s) => s.id)).toEqual(['b', 'a']);

    await library.remove('b');
    expect(library.summaries().map((s) => s.id)).toEqual(['a']);
    expect(repository.layouts.has('b')).toBe(false);
  });

  it('reports unknown ids', async () => {
    const library = new LayoutLibrary(new MemoryLayoutRepository(), new FakeClock());
    expect((await library.rename('x', 'y')).ok).toBe(false);
    expect((await library.remove('x')).ok).toBe(false);
    expect((await library.move('x', 'up')).ok).toBe(false);
  });
});
