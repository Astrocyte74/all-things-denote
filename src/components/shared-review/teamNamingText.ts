import { DEFAULT_TEAM_NAMING, MAX_NAME_POOL, TEAM_NAME_IDEAS, teamNameKey, type TeamNamingSettings } from '@/lib/teamNaming';

/** Own names are on by default when teams choose, off by default for random. */
export function defaultAllowCustom(assignment: TeamNamingSettings['assignment']) {
  return assignment === 'choose';
}

export function isQuickDefault(value: TeamNamingSettings) {
  return value.pool === DEFAULT_TEAM_NAMING.pool
    && value.assignment === DEFAULT_TEAM_NAMING.assignment
    && value.allowCustom === DEFAULT_TEAM_NAMING.allowCustom;
}

/** Drop duplicate names (by the shared identity key) and cap the pool. */
export function uniqueNames(names: readonly string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = teamNameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_NAME_POOL) break;
  }
  return out;
}

/**
 * What gets sent on create. The draft keeps picked names even while the pool
 * is "all" (so switching back and forth loses nothing), but they're only sent
 * for a selected pool.
 */
export function normalizedTeamNaming(value: TeamNamingSettings): TeamNamingSettings {
  return { ...value, names: value.pool === 'selected' ? uniqueNames(value.names) : [] };
}

/** A reason creation can't go ahead, or null. Fewer names than teams is fine. */
export function teamNamingProblem(value: TeamNamingSettings): string | null {
  if (value.pool === 'selected' && uniqueNames(value.names).length === 0) return 'Pick at least one team name, or use all standard names.';
  return null;
}

/** One-line summary for the review card. */
export function describeTeamNaming(value: TeamNamingSettings): string {
  const count = uniqueNames(value.names).length;
  const pool = value.pool === 'all'
    ? `all ${TEAM_NAME_IDEAS.length} standard names`
    : `${count} ${count === 1 ? 'name' : 'names'} you picked`;
  const how = value.assignment === 'choose' ? `Teams choose from ${pool}` : `Random from ${pool}`;
  return `${how} · ${value.allowCustom ? 'own names allowed' : 'no own names'}`;
}
