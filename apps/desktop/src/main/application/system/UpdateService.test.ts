import { appError, err, ok, type Result } from '@magwin/core';
import { describe, expect, it } from 'vitest';
import type { UpdateState } from '../../../shared/contracts';
import { Emitter } from '../../domain/Emitter';
import type { Unsubscribe, UpdateSource } from '../../domain/ports';
import { FakeClock, FakeScheduler, MemoryLogger } from '../test/index';
import { UPDATE_CHECK_MS, UpdateService } from './UpdateService';

class FakeUpdateSource implements UpdateSource {
  next: Result<string | null> = ok(null);
  checks = 0;
  installs = 0;
  private readonly downloaded = new Emitter<string>();
  private readonly failed = new Emitter<string>();

  constructor(readonly supported = true) {}

  check(): Promise<Result<string | null>> {
    this.checks += 1;
    return Promise.resolve(this.next);
  }
  onDownloaded(listener: (version: string) => void): Unsubscribe {
    return this.downloaded.subscribe(listener);
  }
  onFailed(listener: (message: string) => void): Unsubscribe {
    return this.failed.subscribe(listener);
  }
  installAndRestart(): void {
    this.installs += 1;
  }
  finishDownload(version: string): void {
    this.downloaded.emit(version);
  }
  fail(message: string): void {
    this.failed.emit(message);
  }
}

function setup(supported = true) {
  const scheduler = new FakeScheduler(new FakeClock());
  const source = new FakeUpdateSource(supported);
  const service = new UpdateService({ source, scheduler, logger: new MemoryLogger() });
  return { scheduler, source, service };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('UpdateService', () => {
  it('stays unsupported and never checks in a development run', async () => {
    const { service, source, scheduler } = setup(false);
    service.start();
    expect(scheduler.pending()).toBe(0);
    expect(await service.check()).toEqual({ kind: 'unsupported' });
    expect(source.checks).toBe(0);
  });

  it('checks after the initial delay and then on an interval', async () => {
    const { service, source, scheduler } = setup();
    service.start();
    scheduler.advance(UPDATE_CHECK_MS.initialDelay - 1);
    expect(source.checks).toBe(0);
    scheduler.advance(1);
    await flush();
    expect(source.checks).toBe(1);
    expect(service.current()).toEqual({ kind: 'upToDate' });
    scheduler.advance(UPDATE_CHECK_MS.interval);
    await flush();
    expect(source.checks).toBe(2);
  });

  it('downloads a newer version and installs it on request', async () => {
    const { service, source } = setup();
    service.start();
    const seen: UpdateState['kind'][] = [];
    service.onChange((state) => seen.push(state.kind));
    source.next = ok('1.2.0');
    expect(await service.check()).toEqual({ kind: 'downloading', version: '1.2.0' });
    service.installAndRestart();
    expect(source.installs).toBe(0);
    source.finishDownload('1.2.0');
    expect(service.current()).toEqual({ kind: 'ready', version: '1.2.0' });
    service.installAndRestart();
    expect(source.installs).toBe(1);
    expect(seen).toEqual(['checking', 'downloading', 'ready']);
  });

  it('does not check again while downloading or once ready', async () => {
    const { service, source } = setup();
    service.start();
    source.next = ok('1.2.0');
    await service.check();
    await service.check();
    source.finishDownload('1.2.0');
    await service.check();
    expect(source.checks).toBe(1);
  });

  it('keeps ready when the download finished before the check resolved', async () => {
    const { service, source } = setup();
    service.start();
    source.next = ok('1.2.0');
    const pending = service.check();
    source.finishDownload('1.2.0');
    expect(await pending).toEqual({ kind: 'ready', version: '1.2.0' });
  });

  it('reports failures and lets the user retry', async () => {
    const { service, source } = setup();
    service.start();
    source.next = err(appError('UPDATE_CHECK', 'offline'));
    expect(await service.check()).toEqual({ kind: 'failed' });
    source.next = ok('1.2.0');
    await service.check();
    source.fail('download interrupted');
    expect(service.current()).toEqual({ kind: 'failed' });
    expect(source.checks).toBe(2);
  });

  it('keeps a downloaded update when a later error arrives', () => {
    const { service, source } = setup();
    service.start();
    source.finishDownload('1.2.0');
    source.fail('late error');
    expect(service.current()).toEqual({ kind: 'ready', version: '1.2.0' });
  });

  it('stops its timers and listeners', () => {
    const { service, source, scheduler } = setup();
    service.start();
    service.stop();
    expect(scheduler.pending()).toBe(0);
    source.finishDownload('1.2.0');
    expect(service.current()).toEqual({ kind: 'idle' });
  });
});
