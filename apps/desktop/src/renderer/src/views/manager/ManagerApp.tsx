import { useEffect, useState, type ReactNode } from 'react';
import type { MainTab } from '../../../../shared/contracts';
import type { Messages } from '../../../../shared/i18n';
import { useApi } from '../../api/ApiContext';
import { useI18n } from '../../i18n/I18nContext';
import { GridTab } from './GridTab';
import { HelpTab } from './HelpTab';
import { LayoutsTab } from './LayoutsTab';
import './manager.css';
import { StatusTab } from './StatusTab';
import { SupportTab } from './SupportTab';

const TABS: readonly { readonly id: MainTab; readonly label: keyof Messages['tabs'] }[] = [
  { id: 'layouts', label: 'layouts' },
  { id: 'grid', label: 'settings' },
  { id: 'status', label: 'status' },
  { id: 'help', label: 'help' },
  { id: 'support', label: 'support' },
];

/** The main window: layouts manager, grid settings, system status, help and support. */
export function ManagerApp({ initialTab }: { initialTab: MainTab }): ReactNode {
  const api = useApi();
  const { t } = useI18n();
  const [tab, setTab] = useState<MainTab>(initialTab);

  useEffect(() => api.windows.onNavigate(setTab), [api]);

  return (
    <div className="manager">
      <nav className="tabs" role="tablist" aria-label="OrgaWin">
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
            {t.tabs[item.label]}
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
