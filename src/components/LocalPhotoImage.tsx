import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { getStoredPhoto } from '@/lib/photoStorage';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { photoId: string; eager?: boolean };

/** Keep full image bytes only while the photo is near the viewport. */
export function LocalPhotoImage({ photoId, eager = false, alt, ...props }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState<{ id: string; src: string } | null>(null);
  useEffect(() => {
    let version = 0;
    function show(visible: boolean) {
      const request = ++version;
      if (!visible) { setLoaded(null); return; }
      void getStoredPhoto(photoId).then(photo => {
        if (request === version) setLoaded({ id: photoId, src: photo.imageData });
      }).catch(() => { if (request === version) setLoaded(null); });
    }
    if (eager || !window.IntersectionObserver) {
      show(true);
      return () => { version++; };
    }
    const observer = new IntersectionObserver(entries => show(entries[entries.length - 1].isIntersecting), { rootMargin: '160px' });
    observer.observe(ref.current!);
    return () => { version++; observer.disconnect(); };
  }, [photoId, eager]);
  return <img {...props} ref={ref} alt={alt} src={loaded?.id === photoId ? loaded.src : undefined} />;
}
