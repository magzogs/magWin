import { existsSync } from 'node:fs';
import type { HelperState } from '../../../shared/contracts';
import { Emitter } from '../../domain/Emitter';
import type { Logger, Unsubscribe } from '../../domain/ports';
import type { HelperClient } from './HelperClient';
import type { HelperProcess } from './HelperProcess';
import { HELPER_PROTOCOL_VERSION, helloResult } from './protocol';

export interface HelperConnectionState {
  readonly state: HelperState;
  readonly message: string | null;
}

/** Starts the helper and performs the `hello` handshake after every (re)start. */
export class HelperConnection {
  private readonly states = new Emitter<HelperConnectionState>();

  constructor(
    private readonly binaryPath: string,
    private readonly process: HelperProcess,
    private readonly client: HelperClient,
    private readonly logger: Logger,
  ) {}

  onState(listener: (state: HelperConnectionState) => void): Unsubscribe {
    return this.states.subscribe(listener);
  }

  start(): void {
    if (!existsSync(this.binaryPath)) {
      this.fail(`Helper binary not found at ${this.binaryPath}. Run "pnpm build:helper".`);
      return;
    }
    this.process.onStart(() => {
      void this.handshake();
    });
    this.process.onGiveUp((reason) => {
      this.fail(`Helper keeps stopping (${reason})`);
    });
    this.process.start();
  }

  stop(): void {
    this.process.stop();
  }

  private async handshake(): Promise<void> {
    this.states.emit({ state: 'starting', message: null });
    const hello = await this.client.request('hello', {}, helloResult);
    if (!hello.ok) {
      this.fail(`Helper handshake failed: ${hello.error.message}`);
      return;
    }
    if (hello.value.protocolVersion !== HELPER_PROTOCOL_VERSION) {
      this.fail(
        `Helper protocol ${hello.value.protocolVersion} does not match app protocol ${HELPER_PROTOCOL_VERSION}. Rebuild the helper.`,
      );
      return;
    }
    this.logger.info(`Helper ready (pid ${hello.value.pid})`);
    this.states.emit({ state: 'ready', message: null });
  }

  private fail(message: string): void {
    this.logger.error(message);
    this.states.emit({ state: 'failed', message });
  }
}
