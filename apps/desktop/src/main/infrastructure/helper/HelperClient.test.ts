import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FakeClock, FakeScheduler, MemoryLogger } from '../../application/test/fakes';
import type { Unsubscribe } from '../../domain/ports';
import { HelperClient, type LineTransport } from './HelperClient';

class LoopbackTransport implements LineTransport {
  readonly sent: string[] = [];
  private lineListener: (line: string) => void = () => undefined;
  private closeListener: (reason: string) => void = () => undefined;

  send(line: string): void {
    this.sent.push(line);
  }
  onLine(listener: (line: string) => void): Unsubscribe {
    this.lineListener = listener;
    return () => undefined;
  }
  onClose(listener: (reason: string) => void): Unsubscribe {
    this.closeListener = listener;
    return () => undefined;
  }
  receive(message: unknown): void {
    this.lineListener(typeof message === 'string' ? message : JSON.stringify(message));
  }
  close(reason: string): void {
    this.closeListener(reason);
  }
  lastId(): number {
    const last = this.sent.at(-1) ?? '{}';
    return (JSON.parse(last) as { id: number }).id;
  }
}

const pidSchema = z.object({ pid: z.number() });

function setup() {
  const transport = new LoopbackTransport();
  const clock = new FakeClock();
  const scheduler = new FakeScheduler(clock);
  const logger = new MemoryLogger();
  return { transport, scheduler, logger, client: new HelperClient(transport, scheduler, logger) };
}

describe('HelperClient', () => {
  it('sends a JSON line and resolves the matching response', async () => {
    const { transport, client } = setup();
    const pending = client.request('apps.launch', { bundleId: 'x' }, pidSchema);
    expect(JSON.parse(transport.sent[0] ?? '')).toEqual({
      id: 1,
      method: 'apps.launch',
      params: { bundleId: 'x' },
    });
    transport.receive({ id: 1, ok: true, result: { pid: 42 } });
    expect(await pending).toEqual({ ok: true, value: { pid: 42 } });
  });

  it('keeps concurrent requests apart', async () => {
    const { transport, client } = setup();
    const first = client.request('a', {}, pidSchema);
    const second = client.request('b', {}, pidSchema);
    transport.receive({ id: 2, ok: true, result: { pid: 2 } });
    transport.receive({ id: 1, ok: true, result: { pid: 1 } });
    expect(await first).toEqual({ ok: true, value: { pid: 1 } });
    expect(await second).toEqual({ ok: true, value: { pid: 2 } });
  });

  it('maps helper errors, bad results, timeouts and closed pipes to error results', async () => {
    const { transport, client, scheduler } = setup();
    const failing = client.request('windows.setFrame', {}, pidSchema);
    transport.receive({
      id: transport.lastId(),
      ok: false,
      error: { code: 'windowNotFound', message: 'gone' },
    });
    expect(await failing).toEqual({
      ok: false,
      error: { code: 'windowNotFound', message: 'gone' },
    });

    const malformed = client.request('x', {}, pidSchema);
    transport.receive({ id: transport.lastId(), ok: true, result: { nope: true } });
    expect((await malformed).ok ? 'ok' : 'err').toBe('err');

    const slow = client.request('slow', {}, pidSchema, 100);
    scheduler.advance(101);
    const timedOut = await slow;
    expect(timedOut.ok ? 'ok' : timedOut.error.code).toBe('helperTimeout');

    const orphan = client.request('y', {}, pidSchema);
    transport.close('exit 1');
    const closed = await orphan;
    expect(closed.ok ? 'ok' : closed.error.code).toBe('helperClosed');
  });

  it('delivers validated events and ignores malformed ones', () => {
    const { transport, client, logger } = setup();
    const seen: number[] = [];
    client.on('edge.hover', pidSchema, (data) => seen.push(data.pid));
    transport.receive({ event: 'edge.hover', data: { pid: 7 } });
    transport.receive({ event: 'edge.hover', data: { pid: 'x' } });
    transport.receive('not json');
    expect(seen).toEqual([7]);
    expect(logger.lines).toHaveLength(2);
  });
});
