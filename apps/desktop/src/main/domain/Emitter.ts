import type { Unsubscribe } from './ports';

/** Minimal typed observer list used for "something changed" notifications. */
export class Emitter<T> {
  private readonly listeners = new Set<(value: T) => void>();

  subscribe(listener: (value: T) => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }
}
