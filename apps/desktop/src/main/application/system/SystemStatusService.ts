import type { HelperState, SystemStatus } from '../../../shared/contracts';
import type {
  Cancel,
  Logger,
  PermissionGate,
  Scheduler,
  ShortcutInspector,
  Unsubscribe,
} from '../../domain/ports';
import { Emitter } from '../../domain/Emitter';

export interface SystemStatusDeps {
  readonly permissions: PermissionGate;
  readonly shortcuts: ShortcutInspector;
  readonly scheduler: Scheduler;
  readonly logger: Logger;
}

/** Poll quickly while waiting for the user to grant Accessibility, slowly afterwards. */
export const STATUS_POLL_MS = { waitingForPermission: 3_000, steady: 30_000 } as const;

const INITIAL: SystemStatus = {
  helper: 'starting',
  helperMessage: null,
  accessibility: false,
  screenRecording: false,
  hotkeys: null,
  restoring: false,
  canUndo: false,
};

/** Aggregated health shown in the tray and the status tab. */
export class SystemStatusService {
  private status: SystemStatus = INITIAL;
  private readonly changes = new Emitter<SystemStatus>();
  private cancelPoll: Cancel | null = null;

  constructor(private readonly deps: SystemStatusDeps) {}

  current(): SystemStatus {
    return this.status;
  }

  onChange(listener: (status: SystemStatus) => void): Unsubscribe {
    return this.changes.subscribe(listener);
  }

  setHelperState(helper: HelperState, helperMessage: string | null = null): void {
    this.update({ helper, helperMessage });
    if (helper === 'ready') {
      void this.refresh();
    }
  }

  setRestoreState(restoring: boolean, canUndo: boolean): void {
    this.update({ restoring, canUndo });
  }

  /** The helper noticed that Accessibility is missing (e.g. the user revoked it). */
  accessibilityLost(): void {
    this.update({ accessibility: false });
    this.schedulePoll();
  }

  async refresh(): Promise<SystemStatus> {
    if (this.status.helper !== 'ready') {
      return this.status;
    }
    const [permissions, hotkeys] = await Promise.all([
      this.deps.permissions.status(),
      this.deps.shortcuts.missionControlHotkeys(),
    ]);
    if (!permissions.ok) {
      this.deps.logger.warn(`Permission check failed: ${permissions.error.message}`);
    }
    this.update({
      ...(permissions.ok ? permissions.value : {}),
      hotkeys: hotkeys.ok ? hotkeys.value : this.status.hotkeys,
    });
    this.schedulePoll();
    return this.status;
  }

  async requestAccessibility(): Promise<SystemStatus> {
    await this.deps.permissions.requestAccessibility();
    return this.refresh();
  }

  async requestScreenRecording(): Promise<SystemStatus> {
    await this.deps.permissions.requestScreenRecording();
    return this.refresh();
  }

  stop(): void {
    this.cancelPoll?.();
    this.cancelPoll = null;
  }

  private schedulePoll(): void {
    this.cancelPoll?.();
    const delay = this.status.accessibility
      ? STATUS_POLL_MS.steady
      : STATUS_POLL_MS.waitingForPermission;
    this.cancelPoll = this.deps.scheduler.setTimeout(() => {
      void this.refresh();
    }, delay);
  }

  private update(patch: Partial<SystemStatus>): void {
    const next = { ...this.status, ...patch };
    if (JSON.stringify(next) === JSON.stringify(this.status)) {
      return;
    }
    this.status = next;
    this.changes.emit(next);
  }
}
