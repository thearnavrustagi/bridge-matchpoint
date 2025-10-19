// Card theme management utility
export interface ShaderColors {
  color1: [number, number, number, number];
  color2: [number, number, number, number];
  color3: [number, number, number, number];
}

export interface CardTheme {
  back: string;
  front: string;
  shaderTheme: string;
  shaderEnabled: boolean;
}

const CARD_THEME_KEY = 'contract_bridge_card_theme';

const DEFAULT_THEME: CardTheme = {
  back: 'red',
  front: 'balatro',
  shaderTheme: 'ocean',
  shaderEnabled: true
};

export const getCardTheme = (): CardTheme => {
  try {
    const stored = localStorage.getItem(CARD_THEME_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults in case new properties were added
      return {
        ...DEFAULT_THEME,
        ...parsed
      };
    }
  } catch (error) {
    console.error('Error reading card theme from localStorage:', error);
  }
  return DEFAULT_THEME;
};

export const setCardTheme = (theme: CardTheme): void => {
  try {
    localStorage.setItem(CARD_THEME_KEY, JSON.stringify(theme));
  } catch (error) {
    console.error('Error saving card theme to localStorage:', error);
  }
};

// Available card backs (without .png extension)
export const CARD_BACKS = [
  'abandoned',
  'anaglyph',
  'blue',
  'card_back',
  'checkered',
  'erratic',
  'ghost',
  'gradient',
  'gray',
  'green',
  'magic',
  'maze',
  'nebula',
  'painted',
  'plasma',
  'quadrants',
  'red',
  'yellow',
  'zodiac'
];

// Available card fronts (theme folders)
export const CARD_FRONTS = [
  { id: 'balatro', name: 'Balatro' },
  { id: 'balatro-4-colors', name: 'Balatro 4-Color' },
  { id: 'classic', name: 'Classic' }
];

// Get readable name for a card back
export const getCardBackName = (backId: string): string => {
  return backId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Shader color themes
export const SHADER_THEMES: Record<string, { name: string; colors: ShaderColors }> = {
  ocean: {
    name: 'Ocean',
    colors: {
      color1: [0.1, 0.267, 0.231, 1.0],
      color2: [0.0, 0.6, 0.5, 1.0],
      color3: [0.086, 0.137, 0.14, 1.0]
    }
  },
  sunset: {
    name: 'Sunset',
    colors: {
      color1: [0.8, 0.3, 0.2, 1.0],
      color2: [1.0, 0.6, 0.2, 1.0],
      color3: [0.3, 0.1, 0.15, 1.0]
    }
  },
  forest: {
    name: 'Forest',
    colors: {
      color1: [0.2, 0.4, 0.2, 1.0],
      color2: [0.3, 0.7, 0.3, 1.0],
      color3: [0.1, 0.2, 0.1, 1.0]
    }
  },
  midnight: {
    name: 'Midnight',
    colors: {
      color1: [0.1, 0.1, 0.3, 1.0],
      color2: [0.3, 0.2, 0.6, 1.0],
      color3: [0.05, 0.05, 0.15, 1.0]
    }
  },
  rose: {
    name: 'Rose',
    colors: {
      color1: [0.6, 0.2, 0.4, 1.0],
      color2: [0.9, 0.4, 0.6, 1.0],
      color3: [0.2, 0.1, 0.15, 1.0]
    }
  },
  arctic: {
    name: 'Arctic',
    colors: {
      color1: [0.6, 0.7, 0.8, 1.0],
      color2: [0.8, 0.9, 1.0, 1.0],
      color3: [0.3, 0.35, 0.4, 1.0]
    }
  }
};

export const getShaderColors = (themeId: string): ShaderColors => {
  return SHADER_THEMES[themeId]?.colors || SHADER_THEMES.ocean.colors;
};

