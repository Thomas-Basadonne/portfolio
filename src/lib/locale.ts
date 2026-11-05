import { useCallback, useEffect, useState } from "react";
import { defaultLocale, getContent, locales, type Locale } from "../content/portfolio";

const storageKey = "tb:locale";

function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value) && (locales as readonly string[]).includes(value as string);
}

/** Explicit URL choice wins, then the visitor's saved choice, then English. */
export function resolveLocale({
  search,
  stored,
}: {
  search: string;
  stored: string | null;
}): Locale {
  const requested = new URLSearchParams(search).get("lang")?.toLowerCase();
  if (isLocale(requested)) return requested;
  if (isLocale(stored)) return stored;
  return defaultLocale;
}

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  return resolveLocale({ search: window.location.search, stored: readStoredLocale() });
}

function syncDocument(locale: Locale) {
  const { meta } = getContent(locale);
  document.documentElement.lang = locale;
  document.title = meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
}

function syncUrl(locale: Locale) {
  const url = new URL(window.location.href);
  if (locale === defaultLocale) url.searchParams.delete("lang");
  else url.searchParams.set("lang", locale);
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    syncDocument(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    syncUrl(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Storage can be unavailable in private modes; the URL still carries the choice.
    }
  }, []);

  return { locale, setLocale };
}
