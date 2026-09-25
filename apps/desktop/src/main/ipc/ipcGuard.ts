import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import type { z } from 'zod';

/** Only our own renderer (built files or the dev server) may talk to the main process. */
export function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? '';
  const devServer = process.env.ELECTRON_RENDERER_URL;
  return (
    url.startsWith('file://') ||
    (devServer !== undefined && devServer !== '' && url.startsWith(devServer))
  );
}

/** Request/response channel whose payload is validated before the handler runs. */
export function handle<S extends z.ZodType, R>(
  channel: string,
  schema: S,
  handler: (input: z.infer<S>, event: IpcMainInvokeEvent) => Promise<R> | R,
): void {
  ipcMain.handle(channel, async (event, raw: unknown) => {
    if (!isTrustedSender(event)) {
      throw new Error(`Rejected ${channel} from an untrusted sender`);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid payload for ${channel}`);
    }
    return handler(parsed.data, event);
  });
}

/** Fire-and-forget channel with the same validation. */
export function listen<S extends z.ZodType>(
  channel: string,
  schema: S,
  handler: (input: z.infer<S>, event: IpcMainEvent) => void,
): void {
  ipcMain.on(channel, (event, raw: unknown) => {
    if (!isTrustedSender(event)) {
      return;
    }
    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      handler(parsed.data, event);
    }
  });
}
