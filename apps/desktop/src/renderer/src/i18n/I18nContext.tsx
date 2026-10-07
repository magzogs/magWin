import { resolveLocale, type Locale } from '@magwin/core';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { messagesFor, type Messages } from '../../../shared/i18n';
import { useApi } from '../api/ApiContext';
import { useLive } from '../api/useLive';

export interface I18n {
  readonly locale: Locale;
  readonly t: Messages;
}

const I18nContext = createContext<I18n | null>(null);

/**
 * Resolves the UI language from the `general.language` setting and the system's preferred
 * languages, and re-renders every window as soon as the setting changes.
 */
export function I18nProvider(props: {
  children: ReactNode;
  systemLanguages?: readonly string[];
}): ReactNode {
  const api = useApi();
  const settings = useLive(api.settings.get, api.settings.onChanged);
  const preference = settings?.general.language ?? 'system';
  const systemLanguages = props.systemLanguages ?? navigator.languages;
  const locale = resolveLocale(preference, systemLanguages);
  const value = useMemo(() => ({ locale, t: messagesFor(locale) }), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (i18n === null) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return i18n;
}
