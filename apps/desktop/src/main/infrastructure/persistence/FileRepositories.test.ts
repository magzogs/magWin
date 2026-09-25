import { DEFAULT_SETTINGS, type Layout } from '@magwin/core';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryLogger } from '../../application/test/fakes';
import { FileLayoutRepository, FileSettingsRepository } from './FileRepositories';
import { readJson } from './JsonFile';

const layout: Layout = {
  schemaVersion: 1,
  id: 'a1b2-c3',
  name: 'Coding',
  createdAt: '2026-09-25T10:00:00.000Z',
  updatedAt: '2026-09-25T10:00:00.000Z',
  displays: [],
  windows: [],
};

describe('file repositories', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'magwin-test-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('round-trips settings and treats a missing file as null', async () => {
    const repository = new FileSettingsRepository(join(directory, 'settings.json'));
    expect(await repository.load()).toBeNull();
    await repository.save(DEFAULT_SETTINGS);
    expect(await repository.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('treats corrupt JSON as missing', async () => {
    const path = join(directory, 'broken.json');
    await writeFile(path, '{ nope', 'utf8');
    expect(await readJson(path)).toBeNull();
  });

  it('stores one file per layout plus the order, and skips invalid files', async () => {
    const logger = new MemoryLogger();
    const repository = new FileLayoutRepository(join(directory, 'layouts'), logger);
    expect(await repository.loadAll()).toEqual([]);
    await repository.save(layout);
    await repository.saveOrder([layout.id]);
    await writeFile(join(directory, 'layouts', 'junk.json'), '{"schemaVersion": 9}', 'utf8');

    expect(await repository.loadAll()).toEqual([layout]);
    expect(await repository.loadOrder()).toEqual([layout.id]);
    expect(logger.lines).toEqual(['warn Skipping invalid layout file junk.json']);

    await repository.remove(layout.id);
    expect((await readdir(join(directory, 'layouts'))).sort()).toEqual(['junk.json', 'order.json']);
  });

  it('refuses ids that could escape the folder', async () => {
    const repository = new FileLayoutRepository(directory, new MemoryLogger());
    await expect(repository.remove('../evil')).rejects.toThrow(/unsafe/);
  });
});
