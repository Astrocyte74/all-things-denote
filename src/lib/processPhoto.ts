import type { Category, Challenge } from '@/types';
import { PACKS } from '@/data/packs';
import { getCategoryTheme } from '@/lib/theme';
import { drawPhotoCard, loadCardFonts } from './photoCard';

/**
 * Turn a captured photo into a keepsake card JPEG (data URL): the whole photo
 * on paper with the clue, scripture, team and path baked in below it, so the
 * design survives download, share and ZIP export. Already-stored photos are
 * never reprocessed and keep the label they were saved with.
 */
export async function processPhoto(file: File, challenge: Challenge, category: Category, pathId?: string, teamName?: string): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not open this photo. Try a JPEG or PNG image.'));
      img.src = imageUrl;
    });
    await loadCardFonts();

    const pack = PACKS.find(p => p.categories.some(c => c.id === category.id));
    const canvas = drawPhotoCard(img, img.naturalWidth || img.width, img.naturalHeight || img.height, {
      number: challenge.number,
      title: challenge.title,
      scripture: challenge.scriptureClue?.reference ?? challenge.scripture,
      accent: getCategoryTheme(category.id).main,
      teamName,
      pathId,
      gameTitle: pack?.title,
      date: new Date(),
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not process this photo.')), 'image/jpeg', 0.92);
    });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read this photo.'));
      reader.onabort = () => reject(new Error('Reading the photo was interrupted.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
