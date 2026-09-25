import { presetLabel, rangeToFrame, type Rect } from '@magwin/core';
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { PaletteState } from '../../../../shared/contracts';
import { useApi } from '../../api/ApiContext';
import { errorMessage } from '../../i18n/ko';
import './palette.css';
import { PresetGrid } from './PresetGrid';
import { usePaletteSelection } from './usePaletteSelection';

function place(rect: Rect): CSSProperties {
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}

/** Size the window will get, shown on the apply button's tooltip. */
function resultSize(
  state: PaletteState,
  presetId: string,
  range: Parameters<typeof rangeToFrame>[2],
): string {
  const preset = state.presets.find((p) => p.id === presetId);
  if (preset === undefined) {
    return '';
  }
  const area = { x: 0, y: 0, ...state.workArea };
  const frame = rangeToFrame(area, preset, range, state.gapPx);
  return `${String(frame.width)} × ${String(frame.height)}`;
}

/**
 * The edge palette (feature 1). Selection lives in exactly one component; the apply button
 * appears next to that component as soon as a cell is selected and disappears with it.
 */
export function PaletteApp(): ReactNode {
  const api = useApi();
  const [state, setState] = useState<PaletteState | null>(null);
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

  useEffect(() => {
    if (state === null) {
      return;
    }
    // Tell the main process once this state is on screen so the panel never flashes old content.
    const frame = requestAnimationFrame(() => {
      api.palette.ready(state.token);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [api, state]);

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
    setError(result.ok ? null : errorMessage(result.code));
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
      aria-label={`${state.appName} 창 배치`}
    >
      {state.layout.slots.map((slot) => {
        const preset = state.presets.find((p) => p.id === slot.presetId);
        if (preset === undefined) {
          return null;
        }
        const range = selection?.presetId === preset.id ? selection.range : null;
        return (
          <div key={slot.presetId} className="slot">
            <div className="preset-label" style={place(slot.label)}>
              {presetLabel(preset).replace('x', ' × ')}
            </div>
            <PresetGrid
              preset={preset}
              selection={selection}
              style={place(slot.grid)}
              onPointerDown={pointerDown}
              onPointerEnter={pointerEnter}
            />
            <button
              type="button"
              className={`apply primary${range === null ? '' : ' visible'}`}
              style={place(slot.apply)}
              disabled={range === null || busy}
              tabIndex={range === null ? -1 : 0}
              aria-hidden={range === null}
              title={range === null ? undefined : resultSize(state, preset.id, range)}
              onClick={() => {
                void apply();
              }}
            >
              적용
            </button>
          </div>
        );
      })}
      {error === null ? null : (
        <div className="palette-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
