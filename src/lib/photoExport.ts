import { zip } from 'fflate';
import type { StoredPhoto } from './photoStorage';

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'hunt';
}

export async function downloadPhotoArchive(photos: StoredPhoto[], packId: string) {
  if (!photos.length) throw new Error('There are no photos to save yet.');
  const files: Record<string, Uint8Array> = {};
  [...photos].sort((a, b) => a.challengeNumber - b.challengeNumber || a.timestamp - b.timestamp)
    .forEach((photo, index) => {
      const bytes = atob(photo.imageData.split(',')[1]);
      const name = `${String(photo.challengeNumber).padStart(2, '0')}-${slug(photo.challengeTitle)}-${index + 1}.jpg`;
      files[name] = Uint8Array.from(bytes, char => char.charCodeAt(0));
    });
  // JPEGs are already compressed; storing them avoids expensive recompression.
  const archive = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (error, result) => error ? reject(error) : resolve(result));
  });
  const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug(packId)}-hunt-photos.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  // Give mobile browsers time to start consuming the file.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
