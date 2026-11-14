import { useState } from 'react';
import { applyUpdate, useOfflineStatus } from '@/lib/pwa';

export function OfflineNotice({ sharedReview = false }: { sharedReview?: boolean }) {
  const status = useOfflineStatus();
  const [dismissed, setDismissed] = useState(false);
  if (!import.meta.env.PROD) return null;
  return (
    <>
      <p role="status" className="px-4 py-2 text-center text-xs font-bold text-ink/70">
        {sharedReview ? 'Cloud photos expire 7 days after event creation · originals stay on team devices'
          : status.ready ? 'Ready for offline hunting · originals stay on this device'
          : status.error ? 'Offline setup could not finish. Reconnect and reopen the app to retry.'
          : 'Preparing this device for offline hunting…'}
      </p>
      {status.update && !dismissed && <aside aria-label="App update" className="fixed inset-x-3 top-3 z-[100] mx-auto max-w-md rounded-2xl border-2 border-ink bg-cream p-4 text-ink shadow-sticker">
        <p className="font-extrabold">A new version is ready</p>
        <p className="mt-1 text-sm">Update when you’re ready. Your saved hunt and photos will stay.</p>
        <div className="mt-3 flex gap-3">
          <button className="btn-3d btn-go rounded-full px-4 py-2 font-bold" disabled={status.saving} onClick={applyUpdate}>
            {status.saving ? 'Saving photo…' : 'Update now'}
          </button>
          <button className="min-h-11 px-3 font-bold" onClick={() => setDismissed(true)}>Later</button>
        </div>
      </aside>}
    </>
  );
}
