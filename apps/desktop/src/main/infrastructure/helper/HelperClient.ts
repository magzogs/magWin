import { appError, err, ok, type Result } from '@magwin/core';
import type { z } from 'zod';
import type { Cancel, Logger, Scheduler, Unsubscribe } from '../../domain/ports';
import { eventEnvelope, responseEnvelope } from './protocol';

/** A bidirectional stream of text lines (the helper's stdin/stdout). */
export interface LineTransport {
  send(line: string): void;
  onLine(listener: (line: string) => void): Unsubscribe;
  /** Called when the other side went away; pending requests fail. */
  onClose(listener: (reason: string) => void): Unsubscribe;
}

interface Pending {
  readonly cancel: Cancel;
  readonly settle: (response: z.infer<typeof responseEnvelope>) => void;
  readonly fail: (code: string, message: string) => void;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;

/** Request/response correlation and typed events over JSON lines. */
export class HelperClient {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor(
    private readonly transport: LineTransport,
    private readonly scheduler: Scheduler,
    private readonly logger: Logger,
  ) {
    transport.onLine((line) => {
      this.handleLine(line);
    });
    transport.onClose((reason) => {
      this.failAll('helperClosed', reason);
    });
  }

  request<T>(
    method: string,
    params: unknown,
    schema: z.ZodType<T>,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<Result<T>> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve) => {
      const cancel = this.scheduler.setTimeout(() => {
        this.pending.delete(id);
        resolve(err(appError('helperTimeout', `${method} did not answer in ${timeoutMs}ms`)));
      }, timeoutMs);
      this.pending.set(id, {
        cancel,
        settle: (response) => {
          resolve(this.decode(method, schema, response));
        },
        fail: (code, message) => {
          resolve(err(appError(code, message)));
        },
      });
      this.transport.send(JSON.stringify({ id, method, params }));
    });
  }

  on<T>(event: string, schema: z.ZodType<T>, listener: (data: T) => void): Unsubscribe {
    const wrapped = (data: unknown): void => {
      const parsed = schema.safeParse(data);
      if (parsed.success) {
        listener(parsed.data);
      } else {
        this.logger.warn(`Ignoring malformed helper event ${event}`);
      }
    };
    const set = this.listeners.get(event) ?? new Set();
    set.add(wrapped);
    this.listeners.set(event, set);
    return () => {
      set.delete(wrapped);
    };
  }

  private decode<T>(
    method: string,
    schema: z.ZodType<T>,
    response: z.infer<typeof responseEnvelope>,
  ): Result<T> {
    if (!response.ok) {
      return err(appError(response.error.code, response.error.message));
    }
    const parsed = schema.safeParse(response.result);
    return parsed.success
      ? ok(parsed.data)
      : err(appError('helperProtocol', `Unexpected ${method} result: ${parsed.error.message}`));
  }

  private handleLine(line: string): void {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      this.logger.warn(`Helper sent a non-JSON line: ${line.slice(0, 120)}`);
      return;
    }
    const event = eventEnvelope.safeParse(message);
    if (event.success) {
      for (const listener of this.listeners.get(event.data.event) ?? []) {
        listener(event.data.data);
      }
      return;
    }
    const response = responseEnvelope.safeParse(message);
    if (!response.success) {
      this.logger.warn(`Helper sent an unknown message: ${line.slice(0, 120)}`);
      return;
    }
    const pending = this.pending.get(response.data.id);
    if (pending !== undefined) {
      this.pending.delete(response.data.id);
      pending.cancel();
      pending.settle(response.data);
    }
  }

  private failAll(code: string, message: string): void {
    for (const pending of this.pending.values()) {
      pending.cancel();
      pending.fail(code, message);
    }
    this.pending.clear();
  }
}
