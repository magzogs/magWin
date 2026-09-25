import { DiagnosticsService } from './application/system/DiagnosticsService';
import { createHelperServices } from './helperServices';
import { helperBinaryPath } from './infrastructure/electron/views';
import { ConsoleLogger, TimerScheduler } from './infrastructure/system/NodeSystem';

const CONNECT_TIMEOUT_MS = 8_000;

/**
 * `magWin --diagnose`: starts the helper, prints a read-only report as JSON and exits.
 * Useful when a permission or shortcut problem needs to be reported.
 */
export async function runDiagnostics(): Promise<number> {
  const logger = new ConsoleLogger();
  const binaryPath = helperBinaryPath();
  const helper = createHelperServices(binaryPath, new TimerScheduler(), logger);
  const state = await new Promise<string>((resolve) => {
    const timer = setTimeout(() => {
      resolve('timeout');
    }, CONNECT_TIMEOUT_MS);
    helper.connection.onState(({ state: next, message }) => {
      if (next !== 'starting') {
        clearTimeout(timer);
        resolve(message === null ? next : `${next}: ${message}`);
      }
    });
    helper.connection.start();
  });
  const report = state === 'ready' ? await new DiagnosticsService(helper).run() : { helper: state };
  process.stdout.write(`${JSON.stringify({ helperPath: binaryPath, ...report }, null, 2)}\n`);
  helper.connection.stop();
  return state === 'ready' ? 0 : 1;
}
