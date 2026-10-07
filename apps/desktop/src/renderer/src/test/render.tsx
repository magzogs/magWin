import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { MagWinApi } from '../../../shared/api';
import { ApiProvider } from '../api/ApiContext';
import { I18nProvider } from '../i18n/I18nContext';

/** Renders with the fake API; the system language defaults to Korean so text assertions hold. */
export function renderWithApi(
  node: ReactNode,
  api: MagWinApi,
  systemLanguages: readonly string[] = ['ko-KR'],
): RenderResult {
  return render(
    <ApiProvider api={api}>
      <I18nProvider systemLanguages={systemLanguages}>{node}</I18nProvider>
    </ApiProvider>,
  );
}
