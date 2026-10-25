import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { formatDate, formatILS, formatNumber } from '@/lib/logic/format';

const LangContext = createContext(null);
const STORAGE_KEY = 'lm_lang';

function initialLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'he';
  } catch {
    return 'he';
  }
}

// Hebrew first (RTL). English is the secondary language.  t('עברית', 'English')
export function LangProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable - ignore */
    }
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isHe: lang === 'he',
      dir: lang === 'he' ? 'rtl' : 'ltr',
      t: (he, en) => (lang === 'he' ? he : en ?? he),
      money: (v, digits) => formatILS(v, lang, digits),
      num: (v) => formatNumber(v, lang),
      date: formatDate,
    }),
    [lang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}