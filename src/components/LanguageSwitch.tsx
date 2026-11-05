import { locales, type Locale, type PortfolioContent } from "../content/portfolio";

type LanguageSwitchProps = {
  locale: Locale;
  ui: PortfolioContent["ui"];
  onChange: (locale: Locale) => void;
  className?: string;
};

export function LanguageSwitch({ locale, ui, onChange, className }: LanguageSwitchProps) {
  return (
    <div
      className={`lang-switch mono-label${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={ui.languageGroup}
    >
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          aria-label={ui.languageNames[option]}
          onClick={() => onChange(option)}
          data-cursor="engage"
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
