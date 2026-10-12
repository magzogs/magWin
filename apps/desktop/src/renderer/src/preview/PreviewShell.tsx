import { EDGES, type Edge } from '@magwin/core';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiProvider } from '../api/ApiContext';
import { I18nProvider } from '../i18n/I18nContext';
import { ManagerApp } from '../views/manager/ManagerApp';
import { PaletteApp } from '../views/palette/PaletteApp';
import { ProgressApp } from '../views/progress/ProgressApp';
import { SaveHudApp } from '../views/save/SaveHudApp';
import type { PreviewControls } from './previewApi';
import './preview.css';

type Screen = 'palette' | 'manager' | 'save' | 'progress';

const SCREENS: readonly { readonly id: Screen; readonly label: string }[] = [
  { id: 'palette', label: '엣지 팔레트' },
  { id: 'manager', label: '관리 창' },
  { id: 'save', label: '저장 HUD' },
  { id: 'progress', label: '복원 HUD' },
];

/** Browser-only harness that renders each window's screen with the in-memory API. */
export function PreviewShell({ controls }: { controls: PreviewControls }): ReactNode {
  const [screen, setScreen] = useState<Screen>('palette');
  const [edge, setEdge] = useState<Edge>('top');

  useEffect(() => {
    if (screen === 'palette') controls.showPalette(edge);
    if (screen === 'progress') controls.playRestore();
  }, [controls, edge, screen]);

  return (
    <ApiProvider api={controls.api}>
      <I18nProvider>
        <div className="preview-shell">
          <nav className="preview-bar">
            <strong>OrgaWin UI preview</strong>
            {SCREENS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={screen === item.id ? 'primary' : ''}
                onClick={() => {
                  setScreen(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
            {screen === 'palette'
              ? EDGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={edge === value ? 'primary' : ''}
                    onClick={() => {
                      setEdge(value);
                    }}
                  >
                    {value}
                  </button>
                ))
              : null}
          </nav>
          <div className={`preview-stage ${screen}`}>
            {screen === 'palette' ? (
              <div className="fake-window">
                <PaletteApp />
              </div>
            ) : null}
            {screen === 'manager' ? <ManagerApp initialTab="layouts" /> : null}
            {screen === 'save' ? <SaveHudApp /> : null}
            {screen === 'progress' ? (
              <div className="hud-frame">
                <ProgressApp />
              </div>
            ) : null}
          </div>
        </div>
      </I18nProvider>
    </ApiProvider>
  );
}
