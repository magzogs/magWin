import { useState, type ReactNode } from 'react';

/** Slider that only commits when the user lets go, so settings are not written on every step. */
export function RangeField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  hint?: string;
  onCommit: (value: number) => void;
}): ReactNode {
  // Local value only while the user is dragging; otherwise the prop is the source of truth.
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? props.value;
  const commit = (): void => {
    if (draft !== null && draft !== props.value) props.onCommit(draft);
    setDraft(null);
  };
  return (
    <label className="field range">
      <span className="field-label">{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={value}
        onChange={(event) => {
          setDraft(Number(event.target.value));
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <output>
        {value}
        {props.unit}
      </output>
      {props.hint === undefined ? null : <small className="muted">{props.hint}</small>}
    </label>
  );
}

export function Toggle(props: {
  label: string;
  checked: boolean;
  hint?: string;
  onChange: (checked: boolean) => void;
}): ReactNode {
  return (
    <label className="field toggle">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => {
          props.onChange(event.target.checked);
        }}
      />
      <span className="field-label">{props.label}</span>
      {props.hint === undefined ? null : <small className="muted">{props.hint}</small>}
    </label>
  );
}

/** Miniature grid used next to presets in the settings. */
export function GridThumbnail({ cols, rows }: { cols: number; rows: number }): ReactNode {
  return (
    <span
      className="grid-thumb"
      aria-hidden
      style={{
        gridTemplateColumns: `repeat(${String(cols)}, 1fr)`,
        gridTemplateRows: `repeat(${String(rows)}, 1fr)`,
      }}
    >
      {Array.from({ length: cols * rows }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}
