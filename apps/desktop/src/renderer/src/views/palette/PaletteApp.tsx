import { replacePreset, resizePreset, type GridPreset, type ResizeDirection } from '@magwin/core';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { PaletteState } from '../../../../shared/contracts';
import { useApi } from '../../api/ApiContext';
import { errorMessage } from '../../../../shared/i18n';
import { useI18n } from '../../i18n/I18nContext';
import './palette.css';
import { PaletteSlotView } from './PaletteSlotView';
import { usePaletteSelection } from './usePaletteSelection';

/**
 * The edge palette (feature 1). Selection lives in exactly one component; the apply button
 * appears in that component's header, right of its title, as soon as a cell is selected and
 * disappears with it. The custom grid is reshaped in place with arrow buttons.
 */
export function PaletteApp(): ReactNode {
  const api = useApi();
  const [state, setState] = useState<PaletteState | null>(null);
  const { t } = useI18n();
  /** Error code, translated when rendered. */
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { selection, pointerDown, pointerEnter, clear } = usePaletteSelection(api.palette);

  useEffect(
    () =>
      api.palette.onState((next) => {
        clear();
        setError(null);
        setBusy(false);
        setState(next);
      }),
    [api, clear],
  );

  const token = state?.token ?? null;
  useEffect(() => {
    if (token === null) {
      return;
    }
    // Tell the main process once this state is on screen so the panel never flashes old content.
    const frame = requestAnimationFrame(() => {
      api.palette.ready(token);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [api, token]);

  const resize = useCallback(
    (preset: GridPreset, direction: ResizeDirection) => {
      const next = resizePreset(preset, direction);
      // The old range may not exist in the new shape, so the selection starts over.
      clear();
      setError(null);
      setState((current) =>
        current === null ? current : { ...current, presets: replacePreset(current.presets, next) },
      );
      void api.palette.resizeCustom({ cols: next.cols, rows: next.rows }).then((result) => {
        if (!result.ok) {
          setError(result.code);
        }
      });
    },
    [api, clear],
  );

  const apply = useCallback(async () => {
    if (selection === null || busy) {
      return;
    }
    setBusy(true);
    const result = await api.palette.apply({
      presetId: selection.presetId,
      range: selection.range,
    });
    setBusy(false);
    setError(result.ok ? null : result.code);
  }, [api, busy, selection]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        if (selection === null) {
          api.palette.dismiss();
        } else {
          clear();
        }
      } else if (event.key === 'Enter') {
        void apply();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [api, apply, clear, selection]);

  if (state === null) {
    return null;
  }
  return (
    <div
      className={`palette ${state.layout.orientation}`}
      style={{ width: state.layout.size.width, height: state.layout.size.height }}
      aria-label={t.palette.label(state.appName)}
    >
      {state.layout.slots.map((slot) => {
        const preset = state.presets.find((p) => p.id === slot.presetId);
        if (preset === undefined) {
          return null;
        }
        return (
          <PaletteSlotView
            key={slot.presetId}
            state={state}
            slot={slot}
            preset={preset}
            selection={selection}
            busy={busy}
            onPointerDown={pointerDown}
            onPointerEnter={pointerEnter}
            onApply={() => {
              void apply();
            }}
            onResize={resize}
          />
        );
      })}
      {error === null ? null : (
        <div className="palette-error" role="alert">
          {errorMessage(t, error)}
        </div>
      )}
    </div>
  );
}
