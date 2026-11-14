import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, Crown, Link2, Loader2, QrCode, ScanLine, Send, Sparkles, Trash2, Users } from 'lucide-react';
import { PACKS, getPackById } from '@/data/packs';
import { createReview, forgetReview, getSavedReviews, openReview, parseReviewLink, reviewConfigured, type SavedReview } from '@/lib/sharedReview';
import { describeError, formatExpiry } from './common';
import { Notice, PackBadge, ReviewShell } from './ui';

const TITLE_LIMIT = 60;

export type ReviewIntent = 'create' | 'join';

const LEAD_TINT: Record<ReviewIntent, string> = { join: '#E7F8D8', create: '#FFF4D9' };

interface ReviewHomeProps {
  packId?: string;
  /** Which flow the visitor picked on the landing; that section leads and takes focus. */
  intent?: ReviewIntent;
  onBack: () => void;
}

export function ReviewHome({ packId, intent, onBack }: ReviewHomeProps) {
  const ids = { title: useId(), link: useId(), game: useId() };
  const [saved, setSaved] = useState<SavedReview[]>(getSavedReviews);
  const [title, setTitle] = useState('');
  const [gameId, setGameId] = useState(() => PACKS.some(p => p.id === packId) ? packId! : PACKS[0].id);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const joinHeading = useRef<HTMLHeadingElement>(null);
  const createHeading = useRef<HTMLHeadingElement>(null);

  // Move focus (and the screen reader) to the flow picked on the landing.
  // The heading takes focus rather than an input, so phones don't pop the
  // keyboard over the instructions.
  useEffect(() => {
    const target = intent === 'join' ? joinHeading.current : intent === 'create' ? createHeading.current : null;
    target?.focus();
  }, [intent]);

  // A game passed in from a finish screen floats its saved events to the top;
  // then the role matching the intent (team links for join, leader for create).
  const preferredRole = intent === 'create' ? 'leader' : intent === 'join' ? 'team' : null;
  const sortedSaved = [...saved].sort((a, b) =>
    (Number(b.packId === packId) - Number(a.packId === packId))
    || (preferredRole ? Number(b.access.role === preferredRole) - Number(a.access.role === preferredRole) : 0));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const clean = title.replace(/\s+/g, ' ').trim();
    if (!clean) { setCreateError('Give your event a name so teams know they’re in the right place.'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const { access } = await createReview(clean, gameId);
      openReview(access);
    } catch (error) {
      setCreateError(describeError(error));
      setCreating(false);
    }
  };

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

  // The picked flow gets the full sticker treatment and a tint; the other
  // stays available as a quieter flat card.
  const cardClass = (flow: ReviewIntent) => (intent && intent !== flow ? 'flat-card' : 'sticker-card');
  const cardStyle = (flow: ReviewIntent) => (intent === flow ? { backgroundColor: LEAD_TINT[flow] } : undefined);

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
      <p className="mt-2 text-xs font-semibold text-ink/60">Removing an event here only forgets it on this device. The link still works.</p>
    </section>
  );

  const joinSection = (
    <section key="join" className={`${cardClass('join')} mb-6 p-4 sm:p-6`} style={cardStyle('join')} aria-labelledby="sr-join">
      <h2 id="sr-join" ref={joinHeading} tabIndex={-1} className="flex items-center gap-2 font-display text-2xl focus:outline-none">
        <QrCode className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" /> Join an event
      </h2>
      <p className="mt-1 text-sm font-semibold text-ink/70">For teams. Joining sets up your hunt, so there’s nothing to enter twice.</p>

      <ol className="mt-4 flex flex-col gap-2.5" aria-labelledby="sr-join">
        <JoinStep n={1} icon={<ScanLine className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}>
          <strong>Scan your leader’s QR code</strong> with your phone’s camera. The event opens right here.
        </JoinStep>
        <JoinStep n={2} icon={<Users className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}>
          <strong>Enter your team name and pick a path.</strong> That sets the game, team and path for your hunt.
        </JoinStep>
        <JoinStep n={3} icon={<Send className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />}>
          <strong>Play, then send the photos you choose.</strong> Nothing uploads until you pick photos afterward.
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

  const createSection = (
    <form key="create" onSubmit={create} className={`${cardClass('create')} mb-6 p-4 sm:p-6`} style={cardStyle('create')} aria-labelledby="sr-create" noValidate>
      <h2 id="sr-create" ref={createHeading} tabIndex={-1} className="flex items-center gap-2 font-display text-2xl focus:outline-none">
        <Sparkles className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" /> Start an event
      </h2>
      <p className="mt-1 text-sm font-semibold text-ink/70">
        For leaders. Pick the game and share one QR code; teams join on their own phones. Review every clue together on your phone or a laptop. Events last 7 days.
      </p>

      <label htmlFor={ids.title} className="mt-4 block font-extrabold">Event name</label>
      <input
        id={ids.title}
        value={title}
        maxLength={TITLE_LIMIT}
        onChange={e => setTitle(e.target.value)}
        placeholder="e.g. Youth night · Nov 14"
        autoComplete="off"
        className="mt-1.5 block min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-4 text-lg font-bold placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
      />

      <fieldset className="mt-4">
        <legend id={ids.game} className="font-extrabold">Game</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby={ids.game}>
          {PACKS.map(pack => {
            const checked = pack.id === gameId;
            return (
              <label
                key={pack.id}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-ink p-2.5 transition-transform has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${checked ? '-translate-y-0.5 shadow-[3px_3px_0_0_#2E2459]' : 'bg-cream'}`}
                style={checked ? { backgroundColor: pack.library.soft } : undefined}
              >
                <input type="radio" name="sr-game" value={pack.id} checked={checked} onChange={() => setGameId(pack.id)} className="sr-only" />
                <PackBadge pack={pack} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg leading-tight">{pack.title}</span>
                  <span className="block truncate text-xs font-bold text-ink/65">{pack.locationLabel ?? pack.setting}</span>
                </span>
                <span aria-hidden="true" className={`h-5 w-5 flex-shrink-0 rounded-full border-2 border-ink ${checked ? 'bg-go' : 'bg-white'}`} />
              </label>
            );
          })}
        </div>
      </fieldset>

      {createError && <div className="mt-4"><Notice tone="error">{createError}</Notice></div>}

      <button
        type="submit"
        disabled={creating || !reviewConfigured}
        className={`btn-3d ${intent === 'join' ? 'btn-white' : 'btn-go'} mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl tracking-wide text-ink sm:w-auto`}
      >
        {creating && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />}
        {creating ? 'Creating…' : 'Create private event'}
      </button>
    </form>
  );

  // The picked flow leads; saved events stay right under it so a team that
  // already joined (or a leader returning) finds theirs without scrolling far.
  const sections = intent === 'join'
    ? [joinSection, savedSection, createSection]
    : intent === 'create'
      ? [createSection, savedSection, joinSection]
      : [savedSection, joinSection, createSection];

  return (
    <ReviewShell onBack={onBack}>
      <header className="mb-7 text-center">
        <h1 className="text-sticker-sun animate-pop-in text-[2.3rem] leading-[1.05] sm:text-5xl">Group events</h1>
        <p className="mx-auto mt-3 max-w-lg font-semibold text-ink/75">
          Play together on any phones. Teams join with one QR code and send the photos they choose; the leader compares every clue on a phone or a laptop.
        </p>
      </header>

      {!reviewConfigured && (
        <div className="mb-6">
          <Notice tone="warn">Group events aren’t connected on this site yet. You can still play on this device, and your photos stay saved here.</Notice>
        </div>
      )}

      {sections}
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
