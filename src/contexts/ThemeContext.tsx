import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeColorConfig {
  id: string;
  name: string;
  hex: string;          // --main-color (標準主色)
  darkHex: string;      // --main-dark (深色強調 / Hover)
  lightHex: string;     // --main-light (淺色輔色 / 大面積背景)
  textOnPrimary: string;
}

export const THEME_COLORS: ThemeColorConfig[] = [
  {
    id: 'red',
    name: '紅',
    hex: '#EF4444',
    darkHex: '#B91C1C',
    lightHex: '#FEF2F2',
    textOnPrimary: '#FFFFFF',
  },
  {
    id: 'orange',
    name: '橙',
    hex: '#F97316',
    darkHex: '#C2410C',
    lightHex: '#FFF7ED',
    textOnPrimary: '#FFFFFF',
  },
  {
    id: 'yellow',
    name: '黃',
    hex: '#D97706',
    darkHex: '#92400E',
    lightHex: '#FEF3C7',
    textOnPrimary: '#111827',
  },
  {
    id: 'green',
    name: '綠',
    hex: '#10B981',
    darkHex: '#047857',
    lightHex: '#ECFDF5',
    textOnPrimary: '#FFFFFF',
  },
  {
    id: 'blue',
    name: '藍',
    hex: '#3B82F6',
    darkHex: '#1D4ED8',
    lightHex: '#EFF6FF',
    textOnPrimary: '#FFFFFF',
  },
  {
    id: 'indigo',
    name: '靛',
    hex: '#6366F1',
    darkHex: '#4338CA',
    lightHex: '#EEF2FF',
    textOnPrimary: '#FFFFFF',
  },
  {
    id: 'violet',
    name: '紫',
    hex: '#8B5CF6',
    darkHex: '#6D28D9',
    lightHex: '#F5F3FF',
    textOnPrimary: '#FFFFFF',
  },
  {
    id: 'gray',
    name: '灰',
    hex: '#475569',
    darkHex: '#334155',
    lightHex: '#F1F5F9',
    textOnPrimary: '#FFFFFF',
  },
];

interface ThemeContextType {
  currentTheme: ThemeColorConfig;
  setThemeColor: (colorId: string) => void;
  availableThemes: ThemeColorConfig[];
}

const DEFAULT_THEME_ID = 'blue';

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEME_COLORS.find(c => c.id === DEFAULT_THEME_ID) || THEME_COLORS[4],
  setThemeColor: () => {},
  availableThemes: THEME_COLORS
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeColorConfig>(() => {
    const saved = localStorage.getItem('selected-theme-color') || localStorage.getItem('theme_primary_color');
    const found = THEME_COLORS.find(c => c.id === saved);
    return found || THEME_COLORS.find(c => c.id === DEFAULT_THEME_ID) || THEME_COLORS[4];
  });

  const applyThemeVariables = (theme: ThemeColorConfig) => {
    const root = document.documentElement;
    // 派發黃金三梯度 CSS 全域變數
    root.style.setProperty('--main-light', theme.lightHex);
    root.style.setProperty('--main-color', theme.hex);
    root.style.setProperty('--main-dark', theme.darkHex);

    // 舊版及衍生變數相容
    root.style.setProperty('--primary-color', theme.hex);
    root.style.setProperty('--primary-hover', theme.darkHex);
    root.style.setProperty('--primary-light', theme.lightHex);
    root.style.setProperty('--text-on-primary', theme.textOnPrimary);
  };

  useEffect(() => {
    applyThemeVariables(currentTheme);
  }, [currentTheme]);

  const setThemeColor = (colorId: string) => {
    const found = THEME_COLORS.find(c => c.id === colorId);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem('selected-theme-color', found.id);
      localStorage.setItem('theme_primary_color', found.id);
      applyThemeVariables(found);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setThemeColor, availableThemes: THEME_COLORS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
