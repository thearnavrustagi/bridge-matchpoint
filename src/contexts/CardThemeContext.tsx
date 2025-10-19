import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCardTheme, setCardTheme as saveCardTheme, type CardTheme } from '../utils/cardTheme';

interface CardThemeContextType {
  theme: CardTheme;
  updateTheme: (theme: CardTheme) => void;
}

const CardThemeContext = createContext<CardThemeContextType | undefined>(undefined);

export const CardThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<CardTheme>(getCardTheme());

  const updateTheme = (newTheme: CardTheme) => {
    saveCardTheme(newTheme);
    setTheme(newTheme);
  };

  return (
    <CardThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </CardThemeContext.Provider>
  );
};

export const useCardTheme = () => {
  const context = useContext(CardThemeContext);
  if (context === undefined) {
    throw new Error('useCardTheme must be used within a CardThemeProvider');
  }
  return context;
};

