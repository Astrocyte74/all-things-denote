import type { GamePack } from '@/types';
import { scavengerPack } from './scavengerPack';
import { creationPack } from './creationPack';

/** All registered game packs. Add a new game by authoring a pack and listing it here. */
export const PACKS: GamePack[] = [scavengerPack, creationPack];

export const DEFAULT_PACK_ID = 'scavenger';

export function getPackById(id: string): GamePack {
  return PACKS.find((p) => p.id === id) ?? scavengerPack;
}
