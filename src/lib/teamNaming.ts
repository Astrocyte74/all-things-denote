/** Shared content and policy helpers. Safe to import in the browser and Worker. */
export interface TeamNamingSettings {
  pool: 'all' | 'selected';
  names: string[];
  assignment: 'choose' | 'random';
  allowCustom: boolean;
}

export const MAX_NAME_POOL = 50;
export const DEFAULT_TEAM_NAMING: TeamNamingSettings = {
  pool: 'all', names: [], assignment: 'choose', allowCustom: true,
};

export const TEAM_NAME_IDEAS: readonly string[] = [
  'Bright Sparks', 'Trail Blazers', 'Wonder Seekers', 'Kind Hearts',
  'Clue Crew', 'Happy Campers', 'Golden Eagles', 'Curious Otters',
  'Hidden Gems', 'Mighty Mustangs', 'Clever Foxes', 'Brave Bears',
  'Sunshine Squad', 'Mountain Movers', 'Team Lighthouse', 'Joyful Journeys',
  'Puzzle Pals', 'Friendly Falcons', 'Discovery Crew', 'Rainbow Rangers',
  'Path Finders', 'Hope Hunters', 'Helping Hands', 'Star Seekers',
  'Good Neighbours', 'Open Eyes', 'Bold Badgers', 'Silver Owls',
  'Everyday Explorers', 'The Lookouts', 'Adventure Squad', 'Peace Makers',
  'Faithful Friends', 'The Gatherers', 'Map Makers', 'Joy Finders',
  'Bright Horizons', 'The Navigators', 'Trail Mix', 'Big Ideas',
  'The Detectives', 'Amazing Acorns', 'Little Wonders', 'The Wayfinders',
  'Brilliant Beavers', 'The Seekers', 'Treasure Trackers', 'Team Together',
  'Green Sprouts', 'The Connectors', 'Compass Crew', 'The Good Find',
  'The Encouragers', 'Trail Trekkers', 'Friendly Fireflies', 'The Lanterns',
  'The Storytellers', 'The Discoverers', 'Steady Steps', 'Team Possibility',
];

export function teamNameKey(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Selected names last until used; a small pool never prevents another team joining. */
export function availableTeamNames(settings: TeamNamingSettings, usedNames: readonly string[]): string[] {
  const used = new Set(usedNames.map(teamNameKey));
  const uniqueAvailable = (names: readonly string[]) => {
    const seen = new Set(used);
    return names.filter(name => {
      const key = teamNameKey(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const pool = settings.pool === 'selected' ? settings.names : [...settings.names, ...TEAM_NAME_IDEAS];
  const remaining = uniqueAvailable(pool);
  return remaining.length ? remaining : uniqueAvailable(TEAM_NAME_IDEAS);
}
