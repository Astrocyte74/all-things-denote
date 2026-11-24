import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, Crown, Link2, QrCode, ScanLine, Send, Trash2, Users } from 'lucide-react';
import { getPackById } from '@/data/packs';
import { forgetReview, getSavedReviews, openReview, openReviewHome, parseReviewLink, reviewConfigured, type SavedReview } from '@/lib/sharedReview';
import { formatExpiry } from './common';
import { Notice, PackBadge, ReviewShell } from './ui';
import { InviteScanner } from './InviteScanner';
import { CreateEventWizard } from './CreateEventWizard';

export type ReviewIntent = 'create' | 'join';

const LEAD_TINT: Record<ReviewIntent, string> = { join: '#E7F8D8', create: '#FFF4D9' };

interface ReviewHomeProps {
  packId?: string;
  /** One focused flow, or the saved-events hub when absent. */
  intent?: ReviewIntent;
  onBack: () => void;
}

export function ReviewHome({ packId, intent, onBack }: ReviewHomeProps) {
  const ids = { link: useId() };
  const [saved, setSaved] = useState<SavedReview[]>(getSavedReviews);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanButton = useRef<HTMLButtonElement>(null);
  const joinHeading = useRef<HTMLHeadingElement>(null);

  // Move focus (and the screen reader) to the join flow picked on the landing.
  // The heading takes focus rather than an input, so phones don't pop the
  // keyboard over the instructions. The create wizard focuses its own steps.
  useEffect(() => {
    if (intent === 'join') joinHeading.current?.focus();
  }, [intent]);

  // A game passed in from a finish screen floats its saved events to the top;
  // then the role matching the intent (team links for join, leader for create).
  const preferredRole = intent === 'create' ? 'leader' : intent === 'join' ? 'team' : null;
  const sortedSaved = [...saved].sort((a, b) =>
    (Number(b.packId === packId) - Number(a.packId === packId))
    || (preferredRole ? Number(b.access.role === preferredRole) - Number(a.access.role === preferredRole) : 0));

  const openLink = (e: FormEvent) => {
    e.preventDefault();
    const access = parseReviewLink(link);
    if (!access) {
      setLinkError('That doesn’t look like a group event link for this app. Paste the full link your leader sent.');
      return;
    }
    setLinkError(null);
    openReview(access);
  };

  const savedSection = sortedSaved.length > 0 && (
    <section key="saved" className="mb-7" aria-labelledby="sr-saved">
      <h2 id="sr-saved" className="mb-3 flex items-center gap-2 font-display text-2xl">
        <CalendarDays className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" /> Your events
      </h2>
      <ul className="flex flex-col gap-3">
        {sortedSaved.map(item => {
          const pack = getPackById(item.packId);
          const leader = item.access.role === 'leader';
          return (
            <li key={`${item.access.eventId}:${item.access.role}`} className="sticker-card flex items-center gap-3 p-3 sm:p-4">
              <PackBadge pack={pack} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-display text-xl leading-tight">{item.title}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-[0.7rem] font-extrabold uppercase tracking-wide ${leader ? 'bg-sun' : 'bg-sky-soft'}`}>
                    {leader ? <Crown className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : <Users className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                    {leader ? 'Leader' : 'Team'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-ink/70">{pack.title} · Ends {formatExpiry(item.expiresAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => { forgetReview(item.access.eventId); setSaved(getSavedReviews()); }}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-ink/60 hover:bg-coral-soft hover:text-ink"
                aria-label={`Remove ${item.title} from this device`}
                title="Remove from this device"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => openReview(item.access)}
                className="btn-3d btn-go inline-flex min-h-11 flex-shrink-0 items-center gap-1 rounded-2xl px-4 font-display text-lg tracking-wide text-ink"
                aria-label={`Open ${item.title}`}
              >
                Open <ArrowRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs font-semibold text-ink/60">Removing an event here forgets its link on this device. Keep your private leader link to reopen an event on another device.</p>

    </section>
  );

  const joinSection = (
    <section key="join" className="sticker-card mb-6 p-4 sm:p-6" style={{ backgroundColor: LEAD_TINT.join }} aria-labelledby="sr-join">
      <h2 id="sr-join" ref={joinHeading} tabIndex={-1} className="flex items-center gap-2 font-display text-2xl focus:outline-none">
        <QrCode className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" /> Scan or open an invite
      </h2>
      <p className="mt-1 text-sm font-semibold text-ink/70">For teams. Joining sets up your hunt, so there’s nothing to enter twice.</p>

      <button ref={scanButton} type="button" onClick={() => setScanning(true)} className="btn-3d btn-go mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl text-ink"><ScanLine className="h-6 w-6" aria-hidden="true" />Scan QR code</button>
      <p className="mt-2 text-center text-xs font-semibold text-ink/70">Your camera opens here. Allow camera access when asked.</p>
      <ol className="mt-4 flex flex-col gap-2.5" aria-labelledby="sr-join">
        <JoinStep n={1} icon={<ScanLine className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}>
          <strong>Scan your leader’s QR code</strong> using the button above, or paste their invite link below.
        </JoinStep>
        <JoinStep n={2} icon={<Users className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}>
          <strong>Pick your team name.</strong> Your game is set and your path is assigned automatically.
        </JoinStep>
        <JoinStep n={3} icon={<Send className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}>
          <strong>Choose how to share.</strong> When you join, you can send new photos as you play or pick photos to send afterward.
        </JoinStep>
      </ol>

      <form onSubmit={openLink} className="mt-5" noValidate>
        <label htmlFor={ids.link} className="flex items-center gap-1.5 font-extrabold">
          <Link2 className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Or paste the link they sent
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id={ids.link}
            value={link}
            onChange={e => { setLink(e.target.value); setLinkError(null); }}
            placeholder="Paste event link"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-ink bg-white px-4 font-bold placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
          />
          <button
            type="submit"
            disabled={!link.trim()}
            className={`btn-3d ${intent === 'join' ? 'btn-go' : 'btn-white'} inline-flex min-h-12 items-center justify-center gap-1.5 rounded-2xl px-5 font-display text-lg tracking-wide text-ink`}
          >
            Open link <ArrowRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
        {linkError && <div className="mt-3"><Notice tone="error">{linkError}</Notice></div>}
      </form>
    </section>
  );

  const createSection = <CreateEventWizard key="create" packId={packId} />;

  return (
    <ReviewShell onBack={onBack}>
      <header className="mb-7 text-center">
        <h1 className="text-sticker-sun animate-pop-in text-[2.3rem] leading-[1.05] sm:text-5xl">{intent === "join" ? "Join an event" : intent === "create" ? "Start an event" : "Group events"}</h1>
        <p className="mx-auto mt-3 max-w-lg font-semibold text-ink/75">
          {intent === 'join' ? 'Open your leader’s invite to get your team ready.' : intent === 'create' ? 'Three quick steps: game, event name, team names. Then share one QR code.' : 'Reopen an event saved on this device, or get a new group started.'}
        </p>
      </header>

      {!reviewConfigured && (
        <div className="mb-6">
          <Notice tone="warn">Group events aren’t connected on this site yet. You can still play on this device, and your photos stay saved here.</Notice>
        </div>
      )}

      {intent === 'join' ? joinSection : intent === 'create' ? createSection : <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => openReviewHome(packId, 'join')} className="btn-3d btn-go min-h-14 rounded-2xl px-5 font-display text-xl">Join an event</button>
        <button type="button" onClick={() => openReviewHome(packId, 'create')} className="btn-3d btn-white min-h-14 rounded-2xl px-5 font-display text-xl">Start an event</button>
      </div>}
      {savedSection}
      <details className="my-4 text-sm text-ink/75">
        <summary className="min-h-11 cursor-pointer py-3 font-bold">Using an iPhone for future activities?</summary>
        <p>Before your next activity, open the app in Safari, tap Share, then Add to Home Screen. Open it from that icon when you play. Save photos from your current browser before switching.</p>
      </details>
      {intent && <p className="text-center text-sm font-semibold text-ink/70">{intent === 'join' ? 'Organizing the hunt?' : 'Joining someone else’s hunt?'} <button type="button" onClick={() => openReviewHome(packId, intent === 'join' ? 'create' : 'join')} className="min-h-11 px-2 font-extrabold text-ink underline underline-offset-4">{intent === 'join' ? 'Start an event instead' : 'Join an event instead'}</button></p>}
      {scanning && <InviteScanner onClose={() => setScanning(false)} onReturnFocus={() => scanButton.current?.focus()} />}
    </ReviewShell>
  );
}

function JoinStep({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink bg-cream font-display text-base">
        {n}
      </span>
      <span className="min-w-0 flex-1 pt-1 text-[0.95rem] font-medium leading-snug text-ink/85">
        <span className="mr-1.5 inline-block align-[-2px] text-ink/70">{icon}</span>
        {children}
      </span>
    </li>
  );
}
