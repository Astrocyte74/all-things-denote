const PREVIEW_EDGE = 512;
const PREVIEW_BYTES = 64 * 1024;

/** The original stays available if this browser cannot decode a preview. */
export async function sharePhotoPreview(original: Blob): Promise<Blob | null> {
  const url = URL.createObjectURL(original);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, PREVIEW_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.72, 0.48]) {
      const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (result && result.size <= PREVIEW_BYTES && result.size < original.size) return result;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
