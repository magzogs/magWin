import {
  createPreset,
  customPreset,
  GRID_LIMITS,
  isCustomPreset,
  presetLabel,
  type GridPreset,
} from '@magwin/core';
import { useState, type ReactNode } from 'react';
import type { Messages } from '../../../../shared/i18n';
import { useI18n } from '../../i18n/I18nContext';
import { GridThumbnail } from './fields';

export const MAX_PRESETS = 12;

function moved(presets: readonly GridPreset[], index: number, delta: number): GridPreset[] {
  const target = index + delta;
  const next = [...presets];
  const a = next[index];
  const b = next[target];
  if (a === undefined || b === undefined) return next;
  next[index] = b;
  next[target] = a;
  return next;
}

function displayName(t: Messages, preset: GridPreset): string {
  const size = presetLabel(preset).replace('x', ' × ');
  return isCustomPreset(preset) ? t.presets.custom(size) : size;
}

/** Kept as data so the message follows a language change. */
type AddError = { readonly kind: 'range' } | { readonly kind: 'duplicate'; readonly label: string };

function addErrorText(t: Messages, error: AddError): string {
  return error.kind === 'range'
    ? t.presets.outOfRange(GRID_LIMITS.min, GRID_LIMITS.max)
    : t.presets.duplicate(error.label);
}

function PresetRow(props: {
  preset: GridPreset;
  first: boolean;
  last: boolean;
  only: boolean;
  onMove: (delta: number) => void;
  onRemove: () => void;
}): ReactNode {
  const { t } = useI18n();
  const name = displayName(t, props.preset);
  return (
    <li>
      <GridThumbnail cols={props.preset.cols} rows={props.preset.rows} />
      <span className="preset-name">{name}</span>
      <button
        type="button"
        aria-label={t.presets.moveEarlier(name)}
        disabled={props.first}
        onClick={() => {
          props.onMove(-1);
        }}
      >
        ←
      </button>
      <button
        type="button"
        aria-label={t.presets.moveLater(name)}
        disabled={props.last}
        onClick={() => {
          props.onMove(1);
        }}
      >
        →
      </button>
      <button
        type="button"
        className="danger"
        aria-label={t.presets.removeNamed(name)}
        disabled={props.only}
        onClick={props.onRemove}
      >
        {t.common.remove}
      </button>
    </li>
  );
}

/** Add, remove and reorder the grids shown in the edge palette ("3x2" = 3 columns × 2 rows). */
export function PresetEditor(props: {
  presets: readonly GridPreset[];
  onChange: (presets: GridPreset[]) => void;
}): ReactNode {
  const { presets, onChange } = props;
  const { t } = useI18n();
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(2);
  const [error, setError] = useState<AddError | null>(null);
  const full = presets.length >= MAX_PRESETS;
  const hasCustom = presets.some(isCustomPreset);

  const add = (): void => {
    const created = createPreset(cols, rows);
    if (!created.ok) {
      setError({ kind: 'range' });
      return;
    }
    if (presets.some((p) => p.id === created.value.id)) {
      setError({ kind: 'duplicate', label: presetLabel(created.value) });
      return;
    }
    setError(null);
    onChange([...presets, created.value]);
  };

  return (
    <fieldset className="card">
      <legend>{t.settings.sections.presets}</legend>
      <p className="muted">{t.presets.intro}</p>
      <ul className="preset-list">
        {presets.map((preset, index) => (
          <PresetRow
            key={preset.id}
            preset={preset}
            first={index === 0}
            last={index === presets.length - 1}
            only={presets.length === 1}
            onMove={(delta) => {
              onChange(moved(presets, index, delta));
            }}
            onRemove={() => {
              onChange(presets.filter((p) => p.id !== preset.id));
            }}
          />
        ))}
      </ul>
      <form
        className="preset-add"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <label>
          {t.presets.cols}
          <input
            type="number"
            aria-label={t.presets.colsLabel}
            min={GRID_LIMITS.min}
            max={GRID_LIMITS.max}
            value={cols}
            onChange={(e) => {
              setCols(Number(e.target.value));
            }}
          />
        </label>
        <span>×</span>
        <label>
          {t.presets.rows}
          <input
            type="number"
            aria-label={t.presets.rowsLabel}
            min={GRID_LIMITS.min}
            max={GRID_LIMITS.max}
            value={rows}
            onChange={(e) => {
              setRows(Number(e.target.value));
            }}
          />
        </label>
        <button type="submit" disabled={full}>
          {t.presets.add}
        </button>
        {hasCustom ? null : (
          <button
            type="button"
            disabled={full}
            onClick={() => {
              setError(null);
              onChange([...presets, customPreset(2, 2)]);
            }}
          >
            {t.presets.addCustom}
          </button>
        )}
      </form>
      {error === null ? null : (
        <p className="error-text" role="alert">
          {addErrorText(t, error)}
        </p>
      )}
    </fieldset>
  );
}
