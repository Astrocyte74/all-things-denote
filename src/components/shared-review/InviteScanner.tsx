import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Loader2, RefreshCw, X } from 'lucide-react';
import { openReview, parseReviewLink } from '@/lib/sharedReview';
import { Notice } from './ui';

function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera access wasn’t allowed. Allow camera access in your browser’s site settings and try again, or paste the invite link instead.';
  if (name === 'NotFoundError' || name === 'NotSupportedError') return 'No camera is available here. Open the invite with your phone’s Camera app, or paste the link instead.';
  if (name === 'NotReadableError') return 'The camera is busy. Close any other app using it, then try again. You can also paste the invite link.';
  return 'The camera couldn’t start. Try again, or paste the invite link instead.';
}

/** Camera frames stay in memory on this device. Only a validated team invite opens. */
export function InviteScanner({ onClose, onReturnFocus }: { onClose: () => void; onReturnFocus: () => void }) {
  // Dialog portals mount after their parent. Start only once the preview exists.
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<'opening' | 'scanning' | 'error' | 'paused'>('opening');
  const [error, setError] = useState<string | null>(null);
  const [invalidCode, setInvalidCode] = useState(false);

  useEffect(() => {
    if (!video) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      const current = stream;
      stream = undefined;
      current?.getTracks().forEach(track => {
        track.removeEventListener('ended', pause);
        track.stop();
      });
      video.srcObject = null;
    };
    const pause = () => {
      if (stopped) return;
      stop();
      setPhase('paused');
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('Camera unavailable', 'NotSupportedError');
        const opened = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        // Permission may be granted after Cancel, navigation or hiding the page.
        if (stopped) { opened.getTracks().forEach(track => track.stop()); return; }
        stream = opened;
        stream.getVideoTracks().forEach(track => track.addEventListener('ended', pause));
        video.srcObject = stream;
        await video.play();
        const { default: decode } = await import('jsqr');
        if (stopped) return;
        setPhase('scanning');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Camera preview unavailable');
        const scan = () => {
          if (stopped) return;
          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
              const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
              canvas.width = Math.round(video.videoWidth * scale);
              canvas.height = Math.round(video.videoHeight * scale);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
              const code = decode(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
              if (code) {
                const access = parseReviewLink(code.data);
                if (access?.role === 'join') {
                  stop();
                  openReview(access);
                  return;
                }
                setInvalidCode(true);
              }
            }
            // A few frames per second keep decoding responsive without a busy loop.
            timer = window.setTimeout(scan, 200);
          } catch (err) {
            stop();
            setError(cameraError(err));
            setPhase('error');
          }
        };
        scan();
      } catch (err) {
        if (stopped) return;
        stop();
        setError(cameraError(err));
        setPhase('error');
      }
    };
    void start();
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
    };
  }, [attempt, video]);

  const retry = () => { setError(null); setInvalidCode(false); setPhase('opening'); setAttempt(value => value + 1); };

  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/70" />
        <Dialog.Content
          onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus(); }}
          className="sticker-card fixed left-1/2 top-1/2 z-[81] max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-paper p-4 text-ink sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="font-display text-2xl">Scan your event QR code</Dialog.Title>
            <Dialog.Close aria-label="Close QR scanner" className="btn-3d btn-white flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><X className="h-5 w-5" aria-hidden="true" /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-3 text-sm font-semibold">Point your camera at the team-invite QR code your leader is showing. Keep the whole square in view.</Dialog.Description>
          <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-ink bg-ink">
            <video ref={setVideo} muted playsInline autoPlay aria-label="QR scanner camera preview" className="aspect-square max-h-[45svh] w-full object-contain" />
            {phase === 'opening' && <p role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/80 p-4 text-center font-bold text-white"><Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />Opening camera…<span className="text-sm">Allow camera access if asked.</span></p>}
            {(phase === 'error' || phase === 'paused') && <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-ink"><Camera className="h-12 w-12 text-white/60" /></div>}
          </div>
          {phase === 'scanning' && <p role="status" className="mt-3 text-center text-sm font-bold">Looking for your event code…</p>}
          {phase === 'scanning' && invalidCode && <div className="mt-3"><Notice tone="warn">That isn’t a team-invite code for this app. Try the QR code shown by your leader.</Notice></div>}
          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          {phase === 'paused' && <p role="status" className="mt-3 text-sm font-bold">Camera paused while you were away. Restart when you’re ready.</p>}
          {(phase === 'error' || phase === 'paused') && <button type="button" onClick={retry} className="btn-3d btn-go mt-3 inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-extrabold"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try camera again</button>}
          <p className="mt-4 text-xs font-semibold text-ink/70">Scanning stays on this device. No photos are saved or uploaded.</p>
          <Dialog.Close className="mt-2 min-h-11 w-full rounded-xl px-3 text-sm font-extrabold underline underline-offset-4">Paste a link instead</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
