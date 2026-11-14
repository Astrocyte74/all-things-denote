import { PACKS } from '@/data/packs';
import type { EventAccess, ReviewEvent, ReviewSnapshot, ReviewTeam } from './sharedReview';

/** An event hunt has its own progress and photos; local games are left intact. */
export interface EventHunt {
  access: EventAccess;
  event: ReviewEvent;
  team: ReviewTeam;
  pathId: string;
}

export function eventHuntId(eventId: string, teamId: string) {
  return `event:${eventId}:${teamId}`;
}

export function makeEventHunt(access: EventAccess, snapshot: ReviewSnapshot): EventHunt | null {
  const pack = PACKS.find(item => item.id === snapshot.event.packId);
  if (access.role !== 'team' || snapshot.role !== 'team' || !snapshot.team || !pack) return null;
  // Older teams could join without a path. Give them the first path consistently.
  const pathId = pack.paths.find(path => path.id === snapshot.team?.pathId)?.id ?? pack.paths[0].id;
  return { access, event: snapshot.event, team: snapshot.team, pathId };
}
