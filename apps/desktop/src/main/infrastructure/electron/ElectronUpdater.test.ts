import type { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryLogger } from '../../application/test/index';

const updater = vi.hoisted(() => ({
  emitter: null as EventEmitter | null,
  checkForUpdates: vi.fn(),
  quitAndInstall: vi.fn(),
}));

vi.mock('electron', () => ({ app: { isPackaged: true } }));
vi.mock('electron-updater', async () => {
  const { EventEmitter: Events } = await import('node:events');
  const emitter = new Events();
  updater.emitter = emitter;
  return {
    autoUpdater: Object.assign(emitter, {
      checkForUpdates: updater.checkForUpdates,
      quitAndInstall: updater.quitAndInstall,
    }),
  };
});

const { ElectronUpdater } = await import('./ElectronUpdater');

function emitter(): EventEmitter {
  if (updater.emitter === null) throw new Error('electron-updater mock not loaded');
  return updater.emitter;
}

describe('ElectronUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('configures background download and is supported when packaged', async () => {
    const source = new ElectronUpdater(new MemoryLogger());
    const { autoUpdater } = await import('electron-updater');
    expect(source.supported).toBe(true);
    expect(autoUpdater.autoDownload).toBe(true);
    expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
  });

  it('returns the newer version, or null when up to date', async () => {
    const source = new ElectronUpdater(new MemoryLogger());
    updater.checkForUpdates.mockResolvedValueOnce({
      isUpdateAvailable: true,
      updateInfo: { version: '1.2.0' },
    });
    expect(await source.check()).toEqual({ ok: true, value: '1.2.0' });
    updater.checkForUpdates.mockResolvedValueOnce({
      isUpdateAvailable: false,
      updateInfo: { version: '1.1.0' },
    });
    expect(await source.check()).toEqual({ ok: true, value: null });
    updater.checkForUpdates.mockResolvedValueOnce(null);
    expect(await source.check()).toEqual({ ok: true, value: null });
  });

  it('turns a thrown error into a failed result', async () => {
    const source = new ElectronUpdater(new MemoryLogger());
    updater.checkForUpdates.mockRejectedValueOnce(new Error('offline'));
    const result = await source.check();
    expect(result).toMatchObject({ ok: false, error: { code: 'UPDATE_CHECK_FAILED' } });
  });

  it('forwards download and error events until unsubscribed', () => {
    const source = new ElectronUpdater(new MemoryLogger());
    const seen: string[] = [];
    const offDownloaded = source.onDownloaded((version) => seen.push(`ready ${version}`));
    const offFailed = source.onFailed((message) => seen.push(`failed ${message}`));
    emitter().emit('update-downloaded', { version: '1.2.0' });
    emitter().emit('error', new Error('disk full'));
    offDownloaded();
    offFailed();
    emitter().emit('update-downloaded', { version: '1.3.0' });
    expect(seen).toEqual(['ready 1.2.0', 'failed disk full']);
  });

  it('quits and installs', () => {
    new ElectronUpdater(new MemoryLogger()).installAndRestart();
    expect(updater.quitAndInstall).toHaveBeenCalledOnce();
  });
});
