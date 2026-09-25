import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { Logger, Unsubscribe } from '../../domain/ports';
import { Emitter } from '../../domain/Emitter';
import type { LineTransport } from './HelperClient';

/** Restart delays after unexpected exits; after the last one the helper stays down. */
const RESTART_DELAYS_MS = [500, 1_000, 2_000, 5_000, 10_000];
/** A run this long resets the restart budget. */
const HEALTHY_RUN_MS = 60_000;

/**
 * Owns the native helper child process and presents it as one continuous line transport,
 * restarting it with back-off if it crashes.
 */
export class HelperProcess implements LineTransport {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stopping = false;
  private failures = 0;
  private startedAt = 0;
  private readonly lines = new Emitter<string>();
  private readonly closes = new Emitter<string>();
  private readonly starts = new Emitter<number>();
  private readonly givesUp = new Emitter<string>();

  constructor(
    private readonly binaryPath: string,
    private readonly logger: Logger,
  ) {}

  start(): void {
    this.stopping = false;
    this.spawnChild();
  }

  stop(): void {
    this.stopping = true;
    this.child?.stdin.end();
    this.child?.kill();
    this.child = null;
  }

  send(line: string): void {
    if (this.child === null) {
      this.closes.emit('helper is not running');
      return;
    }
    this.child.stdin.write(`${line}\n`);
  }

  onLine(listener: (line: string) => void): Unsubscribe {
    return this.lines.subscribe(listener);
  }

  onClose(listener: (reason: string) => void): Unsubscribe {
    return this.closes.subscribe(listener);
  }

  /** Every (re)start, with the child pid. */
  onStart(listener: (pid: number) => void): Unsubscribe {
    return this.starts.subscribe(listener);
  }

  /** Emitted when the restart budget is exhausted. */
  onGiveUp(listener: (reason: string) => void): Unsubscribe {
    return this.givesUp.subscribe(listener);
  }

  private spawnChild(): void {
    const child = spawn(this.binaryPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    this.startedAt = Date.now();
    createInterface({ input: child.stdout }).on('line', (line) => {
      this.lines.emit(line);
    });
    createInterface({ input: child.stderr }).on('line', (line) => {
      this.logger.warn(`[helper] ${line}`);
    });
    child.on('error', (error) => {
      this.logger.error(`Helper process error: ${error.message}`);
      this.handleExit(child, error.message);
    });
    child.on('exit', (code, signal) => {
      this.handleExit(child, `exit ${String(code ?? signal)}`);
    });
    if (child.pid !== undefined) {
      this.starts.emit(child.pid);
    }
  }

  private handleExit(child: ChildProcessWithoutNullStreams, reason: string): void {
    if (this.child !== child) {
      return;
    }
    this.child = null;
    this.closes.emit(reason);
    if (this.stopping) {
      return;
    }
    if (Date.now() - this.startedAt > HEALTHY_RUN_MS) {
      this.failures = 0;
    }
    const delay = RESTART_DELAYS_MS[this.failures];
    if (delay === undefined) {
      this.givesUp.emit(reason);
      return;
    }
    this.failures += 1;
    this.logger.warn(`Helper stopped (${reason}); restarting in ${delay}ms`);
    setTimeout(() => {
      if (!this.stopping) {
        this.spawnChild();
      }
    }, delay);
  }
}
