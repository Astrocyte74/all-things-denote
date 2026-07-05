export interface Challenge {
  id: string;
  number: number;
  title: string;
  photoTarget: string;
  gospelConnection: string;
  scripture?: string;
  completed: boolean;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
  challenges: Challenge[];
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface BonusItem {
  id: string;
  title: string;
  hint: string;
  connection: string;
  icon: string;
  color: string;
}

export interface Path {
  id: string;
  name: string;
  description: string;
  order: number[];
}

/** Visual tokens for a category or bonus stamp. */
export interface CategoryTheme {
  main: string;
  edge: string;
  soft: string;
  text: string;
  btn: string;
  art: string;
  emoji: string;
}

/** A chip on the landing page (e.g. "15 photos"). */
export interface StatChip {
  emoji: string;
  label: string;
}

/**
 * A complete, self-contained game. The whole app renders off the active pack,
 * so adding a new game = author one of these and register it in data/packs.
 */
export interface GamePack {
  id: string;
  title: string;
  tagline: string;
  /** Short phrase for the setting ("the store", "the outdoors"). */
  setting: string;
  mascotArt: string;
  mascotEmoji: string;
  mascotAlt: string;
  scriptureCitation: string;
  scriptureQuote: string;
  /** Landing-page blurb shown under the title. */
  blurb: string;
  statChips: StatChip[];
  rules: Rule[];
  categories: Category[];
  bonusItems: BonusItem[];
  paths: Path[];
  categoryTheme: Record<string, CategoryTheme>;
  bonusArt: Record<string, { art: string; emoji: string }>;
}

