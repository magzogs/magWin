import {
  appError,
  err,
  ok,
  summarizeLayout,
  type Layout,
  type LayoutSummary,
  type Result,
} from '@magwin/core';
import type { Clock, LayoutRepository, Unsubscribe } from '../../domain/ports';
import { Emitter } from '../../domain/Emitter';

/**
 * Saved layouts in user order. The order doubles as hotkey slots: the first layout is
 * ⌃⌥⌘1, so new layouts are appended to keep existing slots stable.
 */
export class LayoutLibrary {
  private readonly layouts = new Map<string, Layout>();
  private order: string[] = [];
  private readonly changes = new Emitter<LayoutSummary[]>();

  constructor(
    private readonly repository: LayoutRepository,
    private readonly clock: Clock,
  ) {}

  async load(): Promise<void> {
    const [layouts, savedOrder] = await Promise.all([
      this.repository.loadAll(),
      this.repository.loadOrder(),
    ]);
    this.layouts.clear();
    for (const layout of layouts) {
      this.layouts.set(layout.id, layout);
    }
    const known = savedOrder.filter((id) => this.layouts.has(id));
    const rest = layouts
      .filter((l) => !known.includes(l.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((l) => l.id);
    this.order = [...known, ...rest];
  }

  summaries(): LayoutSummary[] {
    return this.order.flatMap((id) => {
      const layout = this.layouts.get(id);
      return layout === undefined ? [] : [summarizeLayout(layout)];
    });
  }

  get(id: string): Layout | undefined {
    return this.layouts.get(id);
  }

  /** Layout in hotkey slot `index` (0-based). */
  atSlot(index: number): Layout | undefined {
    const id = this.order[index];
    return id === undefined ? undefined : this.layouts.get(id);
  }

  async add(layout: Layout): Promise<LayoutSummary> {
    await this.repository.save(layout);
    this.layouts.set(layout.id, layout);
    this.order = [...this.order.filter((id) => id !== layout.id), layout.id];
    await this.persistOrder();
    return summarizeLayout(layout);
  }

  async rename(id: string, name: string): Promise<Result<void>> {
    const layout = this.layouts.get(id);
    if (layout === undefined) {
      return err(appError('layoutNotFound', `No layout ${id}`));
    }
    const renamed = { ...layout, name, updatedAt: this.clock.isoNow() };
    await this.repository.save(renamed);
    this.layouts.set(id, renamed);
    this.notify();
    return ok(undefined);
  }

  async remove(id: string): Promise<Result<void>> {
    if (!this.layouts.has(id)) {
      return err(appError('layoutNotFound', `No layout ${id}`));
    }
    await this.repository.remove(id);
    this.layouts.delete(id);
    this.order = this.order.filter((existing) => existing !== id);
    await this.persistOrder();
    return ok(undefined);
  }

  async move(id: string, direction: 'up' | 'down'): Promise<Result<void>> {
    const index = this.order.indexOf(id);
    if (index < 0) {
      return err(appError('layoutNotFound', `No layout ${id}`));
    }
    const target = direction === 'up' ? index - 1 : index + 1;
    const other = this.order[target];
    if (other === undefined) {
      return ok(undefined);
    }
    const next = [...this.order];
    next[target] = id;
    next[index] = other;
    this.order = next;
    await this.persistOrder();
    return ok(undefined);
  }

  onChange(listener: (summaries: LayoutSummary[]) => void): Unsubscribe {
    return this.changes.subscribe(listener);
  }

  private async persistOrder(): Promise<void> {
    await this.repository.saveOrder(this.order);
    this.notify();
  }

  private notify(): void {
    this.changes.emit(this.summaries());
  }
}
