import type { UpdateState } from '../../../shared/contracts';
import type { Cancel, Logger, Scheduler, Unsubscribe, UpdateSource } from '../../domain/ports';
import { Emitter } from '../../domain/Emitter';

export interface UpdateServiceDeps {
  readonly source: UpdateSource;
  readonly scheduler: Scheduler;
  readonly logger: Logger;
}

/** First check shortly after launch (the helper and tray come up first), then every six hours. */
export const UPDATE_CHECK_MS = { initialDelay: 30_000, interval: 6 * 60 * 60 * 1000 } as const;

/** States in which a new check would only repeat work already under way or done. */
const BUSY: ReadonlySet<UpdateState['kind']> = new Set(['checking', 'downloading', 'ready']);

/** Checks for new versions in the background and offers a restart once one is downloaded. */
export class UpdateService {
  private state: UpdateState;
  private readonly changes = new Emitter<UpdateState>();
  private readonly cancels: Cancel[] = [];
  private readonly unsubscribes: Unsubscribe[] = [];

  constructor(private readonly deps: UpdateServiceDeps) {
    this.state = deps.source.supported ? { kind: 'idle' } : { kind: 'unsupported' };
  }

  current(): UpdateState {
    return this.state;
  }

  onChange(listener: (state: UpdateState) => void): Unsubscribe {
    return this.changes.subscribe(listener);
  }

  start(): void {
    if (!this.deps.source.supported) {
      return;
    }
    const { source, scheduler, logger } = this.deps;
    this.unsubscribes.push(
      source.onDownloaded((version) => {
        this.set({ kind: 'ready', version });
      }),
      source.onFailed((message) => {
        logger.warn(`Update failed: ${message}`);
        // A failure after the download finished does not undo the downloaded update.
        if (this.state.kind !== 'ready') {
          this.set({ kind: 'failed' });
        }
      }),
    );
    const check = (): void => {
      void this.check();
    };
    this.cancels.push(
      scheduler.setTimeout(check, UPDATE_CHECK_MS.initialDelay),
      scheduler.setInterval(check, UPDATE_CHECK_MS.interval),
    );
  }

  async check(): Promise<UpdateState> {
    if (this.state.kind === 'unsupported' || BUSY.has(this.state.kind)) {
      return this.state;
    }
    this.set({ kind: 'checking' });
    const result = await this.deps.source.check();
    if (!result.ok) {
      this.deps.logger.warn(`Update check failed: ${result.error.message}`);
      this.set({ kind: 'failed' });
    } else if (this.state.kind === 'checking') {
      // The download may already have finished (onDownloaded) before check() resolved.
      this.set(
        result.value === null
          ? { kind: 'upToDate' }
          : { kind: 'downloading', version: result.value },
      );
    }
    return this.state;
  }

  installAndRestart(): void {
    if (this.state.kind === 'ready') {
      this.deps.source.installAndRestart();
    }
  }

  stop(): void {
    for (const cancel of this.cancels.splice(0)) cancel();
    for (const unsubscribe of this.unsubscribes.splice(0)) unsubscribe();
  }

  private set(next: UpdateState): void {
    if (JSON.stringify(next) === JSON.stringify(this.state)) {
      return;
    }
    this.state = next;
    this.changes.emit(next);
  }
}
