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
