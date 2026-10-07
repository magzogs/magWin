import type { ReactNode } from 'react';

export interface SidebarItem<Id extends string> {
  readonly id: Id;
  readonly label: string;
}

/** Vertical section list on the left of a settings page; the chosen section shows on the right. */
export function SettingsSidebar<Id extends string>(props: {
  label: string;
  items: readonly SidebarItem<Id>[];
  selected: Id;
  onSelect: (id: Id) => void;
}): ReactNode {
  return (
    <nav
      className="settings-sidebar"
      role="tablist"
      aria-orientation="vertical"
      aria-label={props.label}
    >
      {props.items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`settings-tab-${item.id}`}
          aria-selected={props.selected === item.id}
          aria-controls="settings-panel"
          className={props.selected === item.id ? 'on' : ''}
          onClick={() => {
            props.onSelect(item.id);
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
