import type { CategoryTheme } from '@/types';
import { PACKS } from '@/data/packs';

export type { CategoryTheme };

export const fallbackTheme: CategoryTheme = {
  main: '#FFB020',
  edge: '#D98F00',
  soft: '#FFF4D9',
  text: '#8A5B00',
  btn: 'btn-sun',
  art: 'mascot',
  emoji: '⭐',
};

// Resolve stable IDs directly so switching games never renders the previous theme.
const categoryThemes = Object.assign({}, ...PACKS.map(pack => pack.categoryTheme)) as Record<string, CategoryTheme>;
const bonusArt = Object.assign({}, ...PACKS.map(pack => pack.bonusArt)) as Record<string, { art: string; emoji: string }>;

export function getCategoryTheme(id: string): CategoryTheme {
  return categoryThemes[id] ?? fallbackTheme;
}

export function getBonusArt(id: string): { art: string; emoji: string } | undefined {
  return bonusArt[id];
}

const INK = '#2E2459';

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/**
 * Text color (ink or white) with the better contrast on a candy-colored face.
 * White on amber/sky/leaf is ~2:1; ink on those is 5:1 or better.
 */
export function readableTextOn(hex: string): string {
  const l = luminance(hex);
  const contrastWithInk = (l + 0.05) / (luminance(INK) + 0.05);
  const contrastWithWhite = 1.05 / (l + 0.05);
  return contrastWithInk >= contrastWithWhite ? INK : '#FFFFFF';
}
