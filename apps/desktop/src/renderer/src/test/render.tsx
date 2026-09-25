import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { MagWinApi } from '../../../shared/api';
import { ApiProvider } from '../api/ApiContext';

export function renderWithApi(node: ReactNode, api: MagWinApi): RenderResult {
  return render(<ApiProvider api={api}>{node}</ApiProvider>);
}
