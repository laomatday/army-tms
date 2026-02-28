import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  applyTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const applyTheme = () => {
    const savedTheme = localStorage.getItem('army_theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const isDark = savedTheme === 'dark' || (!savedTheme && sysDark);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#0f172a");
    } else {
      document.documentElement.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#ffffff");
    }
  };

  useEffect(() => {
    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => applyTheme();
    
    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('army_theme_update', applyTheme);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('army_theme_update', applyTheme);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
