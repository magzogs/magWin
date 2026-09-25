import { createPreset, GRID_LIMITS, presetLabel, type GridPreset } from '@magwin/core';
import { useState, type ReactNode } from 'react';
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

/** Add, remove and reorder the grids shown in the edge palette ("3x2" = 3 columns × 2 rows). */
export function PresetEditor(props: {
  presets: readonly GridPreset[];
  onChange: (presets: GridPreset[]) => void;
}): ReactNode {
  const { presets, onChange } = props;
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const add = (): void => {
    const created = createPreset(cols, rows);
    if (!created.ok) {
      setError(`가로·세로는 ${String(GRID_LIMITS.min)}~${String(GRID_LIMITS.max)} 사이여야 해요.`);
      return;
    }
    if (presets.some((p) => p.id === created.value.id)) {
      setError(`${presetLabel(created.value)} 그리드는 이미 있어요.`);
      return;
    }
    setError(null);
    onChange([...presets, created.value]);
  };

  return (
    <fieldset className="card">
      <legend>팔레트 그리드</legend>
      <p className="muted">가로 칸 × 세로 칸. 창 가장자리에 머무르면 이 순서대로 나타나요.</p>
      <ul className="preset-list">
        {presets.map((preset, index) => (
          <li key={preset.id}>
            <GridThumbnail cols={preset.cols} rows={preset.rows} />
            <span className="preset-name">{presetLabel(preset).replace('x', ' × ')}</span>
            <button
              type="button"
              aria-label={`${preset.id} 앞으로`}
              disabled={index === 0}
              onClick={() => {
                onChange(moved(presets, index, -1));
              }}
            >
              ←
            </button>
            <button
              type="button"
              aria-label={`${preset.id} 뒤로`}
              disabled={index === presets.length - 1}
              onClick={() => {
                onChange(moved(presets, index, 1));
              }}
            >
              →
            </button>
            <button
              type="button"
              className="danger"
              aria-label={`${preset.id} 삭제`}
              disabled={presets.length === 1}
              onClick={() => {
                onChange(presets.filter((p) => p.id !== preset.id));
              }}
            >
              삭제
            </button>
          </li>
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
          가로
          <input
            type="number"
            aria-label="가로 칸 수"
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
          세로
          <input
            type="number"
            aria-label="세로 칸 수"
            min={GRID_LIMITS.min}
            max={GRID_LIMITS.max}
            value={rows}
            onChange={(e) => {
              setRows(Number(e.target.value));
            }}
          />
        </label>
        <button type="submit" disabled={presets.length >= MAX_PRESETS}>
          그리드 추가
        </button>
      </form>
      {error === null ? null : (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
