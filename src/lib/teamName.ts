export const TEAM_NAME_LIMIT = 40;

/** A compact, optional label shared by the UI, photo metadata, and exports. */
export function cleanTeamName(value: string | undefined): string {
  return Array.from((value ?? '').replace(/\s+/g, ' ').trim()).slice(0, TEAM_NAME_LIMIT).join('');
}

export function teamPathLabel(teamName?: string, pathId?: string): string {
  return [cleanTeamName(teamName), pathId ? `Path ${pathId}` : ''].filter(Boolean).join(' · ');
}
