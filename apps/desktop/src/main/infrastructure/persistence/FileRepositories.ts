import { layoutSchema, type AppSettings, type Layout } from '@magwin/core';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { LayoutRepository, Logger, SettingsRepository } from '../../domain/ports';
import { readJson, removeFile, writeJson } from './JsonFile';

/** `settings.json` in the app's user data folder. */
export class FileSettingsRepository implements SettingsRepository {
  constructor(private readonly path: string) {}

  load(): Promise<unknown> {
    return readJson(this.path);
  }

  save(settings: AppSettings): Promise<void> {
    return writeJson(this.path, settings);
  }
}

const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/;
const ORDER_FILE = 'order.json';
const orderSchema = z.array(z.string());

/**
 * One JSON file per layout (`layouts/<id>.json`) so a corrupt file only loses one layout,
 * plus `layouts/order.json` for the user's ordering.
 */
export class FileLayoutRepository implements LayoutRepository {
  constructor(
    private readonly directory: string,
    private readonly logger: Logger,
  ) {}

  async loadAll(): Promise<Layout[]> {
    let names: string[];
    try {
      names = await readdir(this.directory);
    } catch {
      return [];
    }
    const layouts: Layout[] = [];
    for (const name of names.filter((n) => n.endsWith('.json') && n !== ORDER_FILE)) {
      const parsed = layoutSchema.safeParse(await readJson(join(this.directory, name)));
      if (parsed.success) {
        layouts.push(parsed.data);
      } else {
        this.logger.warn(`Skipping invalid layout file ${name}`);
      }
    }
    return layouts;
  }

  async save(layout: Layout): Promise<void> {
    await writeJson(this.pathFor(layout.id), layout);
  }

  async remove(id: string): Promise<void> {
    await removeFile(this.pathFor(id));
  }

  async loadOrder(): Promise<string[]> {
    const parsed = orderSchema.safeParse(await readJson(join(this.directory, ORDER_FILE)));
    return parsed.success ? parsed.data : [];
  }

  saveOrder(ids: readonly string[]): Promise<void> {
    return writeJson(join(this.directory, ORDER_FILE), ids);
  }

  private pathFor(id: string): string {
    if (!SAFE_ID.test(id)) {
      throw new Error(`Refusing unsafe layout id ${id}`);
    }
    return join(this.directory, `${id}.json`);
  }
}
