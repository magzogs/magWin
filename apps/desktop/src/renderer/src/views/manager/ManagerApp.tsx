import { useEffect, useState, type ReactNode } from 'react';
import type { MainTab } from '../../../../shared/contracts';
import { useApi } from '../../api/ApiContext';
import { GridTab } from './GridTab';
import { HelpTab } from './HelpTab';
import { LayoutsTab } from './LayoutsTab';
import './manager.css';
import { StatusTab } from './StatusTab';
import { SupportTab } from './SupportTab';

const TABS: readonly { readonly id: MainTab; readonly label: string }[] = [
  { id: 'layouts', label: '레이아웃' },
  { id: 'grid', label: '그리드 설정' },
  { id: 'status', label: '권한 및 상태' },
  { id: 'help', label: 'magWin 도움말' },
  { id: 'support', label: '지원 받기' },
];

/** The main window: layouts manager, grid settings, system status, help and support. */
export function ManagerApp({ initialTab }: { initialTab: MainTab }): ReactNode {
  const api = useApi();
  const [tab, setTab] = useState<MainTab>(initialTab);

  useEffect(() => api.windows.onNavigate(setTab), [api]);

  return (
    <div className="manager">
      <nav className="tabs" role="tablist" aria-label="magWin">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'on' : ''}
            onClick={() => {
              setTab(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <main className="tab-body" role="tabpanel">
        {tab === 'layouts' ? <LayoutsTab /> : null}
        {tab === 'grid' ? <GridTab /> : null}
        {tab === 'status' ? <StatusTab /> : null}
        {tab === 'help' ? <HelpTab onNavigate={setTab} /> : null}
        {tab === 'support' ? <SupportTab onNavigate={setTab} /> : null}
      </main>
    </div>
  );
}
