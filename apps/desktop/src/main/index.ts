import { app } from 'electron';
import { bootstrap } from './bootstrap';
import { runDiagnostics } from './diagnose';

async function start(): Promise<void> {
  if (process.argv.includes('--diagnose')) {
    app.exit(await runDiagnostics());
    return;
  }
  // Menu bar app: no Dock icon unless a regular window is open (see DockPresence).
  app.dock?.hide();
  const runtime = await bootstrap();
  app.on('second-instance', () => {
    runtime.openMain('layouts');
  });
  app.on('before-quit', () => {
    runtime.stop();
  });
}

if (app.requestSingleInstanceLock()) {
  // Keep running in the menu bar after the last window closes.
  app.on('window-all-closed', () => undefined);
  void app.whenReady().then(start);
} else {
  app.quit();
}
