import { useState, useEffect } from 'react';

const THEME_KEY = 'afia_theme';

export type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('theme-light');
  } else {
    document.documentElement.classList.remove('theme-light');
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as Theme | null;
      // Explicit user preference wins
      if (saved === 'light' || saved === 'dark') return saved;
      // Fall back to OS/system preference
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return [theme, toggleTheme];
}
