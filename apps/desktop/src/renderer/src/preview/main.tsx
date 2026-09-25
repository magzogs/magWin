import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/base.css';
import { createPreviewApi } from './previewApi';
import { PreviewShell } from './PreviewShell';

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <PreviewShell controls={createPreviewApi()} />
    </StrictMode>,
  );
}
