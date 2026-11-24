import { zip } from 'fflate';
import { getStoredPhoto, type PhotoSummary } from './photoStorage';

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hunt';
}

export function photoFilename(photo: PhotoSummary, sequence?: number) {
  return [String(photo.challengeNumber).padStart(2, '0'), slug(photo.challengeTitle),
    photo.teamName ? slug(photo.teamName) : '', photo.pathId ? `path-${slug(photo.pathId)}` : '',
    sequence ?? photo.timestamp].filter(value => value !== '').join('-') + '.jpg';
}

export async function downloadPhotoArchive(photos: PhotoSummary[], packId: string) {
  if (!photos.length) throw new Error('There are no photos to save yet.');
  const files: Record<string, Uint8Array> = {};
  const ordered = [...photos].sort((a, b) => a.challengeNumber - b.challengeNumber || a.timestamp - b.timestamp);
  for (const [index, photo] of ordered.entries()) {
    const { imageData } = await getStoredPhoto(photo.id);
    const bytes = atob(imageData.split(',')[1]);
    files[photoFilename(photo, index + 1)] = Uint8Array.from(bytes, char => char.charCodeAt(0));
  }
  // JPEGs are already compressed; storing them avoids expensive recompression.
  const archive = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (error, result) => error ? reject(error) : resolve(result));
  });
  const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  const teams = new Set(photos.map(photo => photo.teamName).filter(Boolean));
  const team = teams.size === 1 ? `-${slug([...teams][0]!)}` : '';
  link.download = `${slug(packId)}${team}-hunt-photos.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  // Give mobile browsers time to start consuming the file.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
