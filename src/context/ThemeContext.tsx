import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'command' | 'crimson' | 'terminal';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        return (localStorage.getItem('vanguard-theme') as Theme) || 'command';
    });

    useEffect(() => {
        const root = window.document.body;
        // Remove prior themes
        root.classList.remove('theme-command', 'theme-crimson', 'theme-terminal');
        // Add active
        root.classList.add(`theme-${theme}`);
        localStorage.setItem('vanguard-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
