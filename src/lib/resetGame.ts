import { clearAllPhotos } from './photoStorage';

/** Works from the library too, where the hunt component is not mounted. */
export async function resetGame(packId: string, deletePhotos: boolean, huntId?: string): Promise<void> {
  // A failed photo deletion must leave progress and team settings available.
  if (deletePhotos) await clearAllPhotos(packId, huntId ?? null);
  for (const key of ['completedChallenges', 'lastChallenge', 'showAnalogiesEarly']) {
    localStorage.removeItem(`${key}:${huntId ?? packId}`);
  }
}
