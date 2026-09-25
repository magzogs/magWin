import { useEffect, useState, type ReactNode } from 'react';
import type { GhostState } from '../../../../shared/contracts';
import { useApi } from '../../api/ApiContext';
import './ghost.css';

/** Translucent preview of where the window will land (click-through overlay). */
export function GhostApp(): ReactNode {
  const api = useApi();
  const [state, setState] = useState<GhostState | null>(null);

  useEffect(() => api.ghost.onState(setState), [api]);

  if (state === null) {
    return null;
  }
  const { x, y, width, height } = state.rect;
  return (
    <div
      className="ghost"
      data-testid="ghost"
      style={{ transform: `translate(${String(x)}px, ${String(y)}px)`, width, height }}
    />
  );
}
