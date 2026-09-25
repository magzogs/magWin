import { createContext, useContext, type ReactNode } from 'react';
import type { MagWinApi } from '../../../shared/api';

const ApiContext = createContext<MagWinApi | null>(null);

/** Components receive the bridge through context so tests can inject a fake (DIP). */
export function ApiProvider({ api, children }: { api: MagWinApi; children: ReactNode }): ReactNode {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): MagWinApi {
  const api = useContext(ApiContext);
  if (api === null) {
    throw new Error('useApi must be used inside <ApiProvider>');
  }
  return api;
}
