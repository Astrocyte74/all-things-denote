// Sticker Quest design tokens per category / bonus item.
//
// Each GamePack now owns its own `categoryTheme` and `bonusArt` maps (see
// src/data/packs/*). This module holds the *active* pack (set by App on
// mount/switch) and exposes lookup helpers the render layer can call without
// knowing which pack is active. `art` names a PNG in /public/art; StickerArt
// falls back to `emoji` when the PNG isn't there.

import type { CategoryTheme, GamePack } from '@/types';

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

let activePack: GamePack | null = null;

/** Set the pack that lookups resolve against. Called by App when the pack changes. */
export function setActivePack(pack: GamePack): void {
  activePack = pack;
}

export function getCategoryTheme(id: string): CategoryTheme {
  return activePack?.categoryTheme[id] ?? fallbackTheme;
}

export function getBonusArt(id: string): { art: string; emoji: string } | undefined {
  return activePack?.bonusArt[id];
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
