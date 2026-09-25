import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { mainTabSchema } from '../../shared/contracts';
import { ApiProvider } from './api/ApiContext';
import './styles/base.css';
import { GhostApp } from './views/ghost/GhostApp';
import { ManagerApp } from './views/manager/ManagerApp';
import { PaletteApp } from './views/palette/PaletteApp';
import { ProgressApp } from './views/progress/ProgressApp';
import { SaveHudApp } from './views/save/SaveHudApp';

/** Composition root of the renderer: one bundle, `?view=` picks the window's screen. */
function viewFor(params: URLSearchParams): { node: ReactNode; opaque: boolean } {
  const view = params.get('view') ?? 'main';
  switch (view) {
    case 'palette':
      return { node: <PaletteApp />, opaque: false };
    case 'ghost':
      return { node: <GhostApp />, opaque: false };
    case 'progress':
      return { node: <ProgressApp />, opaque: false };
    case 'save':
      return { node: <SaveHudApp />, opaque: true };
    default: {
      const tab = mainTabSchema.safeParse(params.get('tab'));
      return { node: <ManagerApp initialTab={tab.success ? tab.data : 'layouts'} />, opaque: true };
    }
  }
}

const root = document.getElementById('root');
if (root !== null) {
  const { node, opaque } = viewFor(new URLSearchParams(window.location.search));
  document.body.classList.toggle('opaque', opaque);
  createRoot(root).render(
    <StrictMode>
      <ApiProvider api={window.magwin}>{node}</ApiProvider>
    </StrictMode>,
  );
}
