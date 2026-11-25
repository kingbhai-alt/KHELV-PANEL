import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

export type ThemeId =
  | 'cyber-ocean'
  | 'obsidian-gold'
  | 'emerald-matrix'
  | 'crimson-velvet'
  | 'frost-blue'
  | 'ivory-gold'
  | 'mint-daylight'
  | 'lavender-pearl';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  tagline: string;
  swatches: [string, string, string]; // [background, card, accent]
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cyber-ocean',
    name: 'Cyber Ocean',
    mode: 'dark',
    tagline: 'Midnight Navy & Electric Sky',
    swatches: ['#070b14', '#0e1528', '#38bdf8'],
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    mode: 'dark',
    tagline: 'Pure Charcoal & Royal Amber',
    swatches: ['#09090b', '#18181b', '#f59e0b'],
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    mode: 'dark',
    tagline: 'Deep Pine & Neon Emerald',
    swatches: ['#04110c', '#092219', '#10b981'],
  },
  {
    id: 'crimson-velvet',
    name: 'Crimson Velvet',
    mode: 'dark',
    tagline: 'Garnet Night & Velvet Rose',
    swatches: ['#12070d', '#220d18', '#fb7185'],
  },
  {
    id: 'frost-blue',
    name: 'Frost Blue',
    mode: 'light',
    tagline: 'Crisp Porcelain & Cobalt Blue',
    swatches: ['#f1f5f9', '#ffffff', '#0284c7'],
  },
  {
    id: 'ivory-gold',
    name: 'Ivory Gold',
    mode: 'light',
    tagline: 'Warm Alabaster & Amber Gold',
    swatches: ['#faf6ed', '#ffffff', '#b45309'],
  },
  {
    id: 'mint-daylight',
    name: 'Mint Daylight',
    mode: 'light',
    tagline: 'Soft Mint & Deep Emerald',
    swatches: ['#ecfdf5', '#ffffff', '#047857'],
  },
  {
    id: 'lavender-pearl',
    name: 'Lavender Pearl',
    mode: 'light',
    tagline: 'Soft Pearl & Royal Indigo',
    swatches: ['#f5f3ff', '#ffffff', '#4f46e5'],
  },
];

const STORAGE_THEME_KEY = 'khelv_theme_id';

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemePreset;
  isDark: boolean;
  setThemeId: (id: ThemeId) => void;
  toggleLightDark: () => void;
}

const DEFAULT_THEME = THEME_PRESETS[0];

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME.id,
  theme: DEFAULT_THEME,
  isDark: true,
  setThemeId: () => {},
  toggleLightDark: () => {},
});

function getInitialThemeId(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME.id;
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY) as ThemeId | null;
    if (saved && THEME_PRESETS.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_THEME.id;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(getInitialThemeId);

  const theme = THEME_PRESETS.find((t) => t.id === themeId) || DEFAULT_THEME;
  const isDark = theme.mode === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.id);
    if (theme.mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme.id);
    } catch {
      // Ignore storage write errors
    }
  }, [theme]);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
  }, []);

  const toggleLightDark = useCallback(() => {
    setThemeIdState((prev) => {
      const current = THEME_PRESETS.find((t) => t.id === prev) || DEFAULT_THEME;
      const idx = THEME_PRESETS.filter((t) => t.mode === current.mode).findIndex(
        (t) => t.id === current.id
      );
      const targetMode: ThemeMode = current.mode === 'dark' ? 'light' : 'dark';
      const targetList = THEME_PRESETS.filter((t) => t.mode === targetMode);
      return (targetList[Math.max(0, idx)] || targetList[0]).id;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeId: theme.id,
        theme,
        isDark,
        setThemeId,
        toggleLightDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
