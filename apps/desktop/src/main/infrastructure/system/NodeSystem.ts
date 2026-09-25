import { randomUUID } from 'node:crypto';
import type { Cancel, Clock, IdGenerator, Logger, Scheduler } from '../../domain/ports';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  isoNow(): string {
    return new Date().toISOString();
  }
}

export class TimerScheduler implements Scheduler {
  setTimeout(callback: () => void, ms: number): Cancel {
    const handle = setTimeout(callback, ms);
    return () => {
      clearTimeout(handle);
    };
  }

  setInterval(callback: () => void, ms: number): Cancel {
    const handle = setInterval(callback, ms);
    return () => {
      clearInterval(handle);
    };
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class UuidGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

/** Info goes to stdout, problems to stderr; both end up in Console.app for packaged builds. */
export class ConsoleLogger implements Logger {
  info(message: string): void {
    process.stdout.write(`[magwin] ${message}\n`);
  }

  warn(message: string): void {
    console.warn(`[magwin] ${message}`);
  }

  error(message: string): void {
    console.error(`[magwin] ${message}`);
  }
}
