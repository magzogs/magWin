import { countsSatisfied, type LiveWindow } from '@magwin/core';
import type { Clock, Scheduler, WindowQuery } from '../../domain/ports';

export interface WaitRequest {
  /** Only windows on this space count; null means any visible desktop. */
  readonly spaceId: number | null;
  /** App key → number of windows the layout needs. */
  readonly expected: ReadonlyMap<string, number>;
  readonly timeoutMs: number;
}

export const WAIT_POLL_MS = 250;

/** Polls the visible windows until launched apps have opened enough windows (or time runs out). */
export class WindowWaiter {
  constructor(
    private readonly windows: WindowQuery,
    private readonly scheduler: Scheduler,
    private readonly clock: Clock,
  ) {}

  async waitFor(request: WaitRequest): Promise<readonly LiveWindow[]> {
    const deadline = this.clock.now() + request.timeoutMs;
    for (;;) {
      const visible = await this.visible(request.spaceId);
      if (countsSatisfied(visible, request.expected) || this.clock.now() >= deadline) {
        return visible;
      }
      await this.scheduler.sleep(WAIT_POLL_MS);
    }
  }

  private async visible(spaceId: number | null): Promise<readonly LiveWindow[]> {
    const listed = await this.windows.listWindows('current');
    if (!listed.ok) {
      return [];
    }
    return spaceId === null
      ? listed.value
      : listed.value.filter((window) => window.spaceIds.includes(spaceId));
  }
}
