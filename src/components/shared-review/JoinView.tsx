import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { getPackById } from '@/data/packs';
import { cleanTeamName, TEAM_NAME_LIMIT } from '@/lib/teamName';
import { getSavedReviews, joinReview, openReview, type EventAccess, type ReviewSnapshot } from '@/lib/sharedReview';
import { PATH_COLORS, describeError, formatExpiry, savedTeamDefaults } from './common';
import { Notice, PackBadge } from './ui';
import { readableTextOn } from '@/lib/theme';

export function JoinView({ access, snapshot, onJoined }: { access: EventAccess; snapshot: ReviewSnapshot; onJoined: (access: EventAccess, snapshot: ReviewSnapshot) => void }) {
  const { event } = snapshot;
  const pack = getPackById(event.packId);
  const ids = { name: useId(), path: useId() };
  const savedTeam = getSavedReviews().find(item => item.access.eventId === event.id && item.access.role === 'team');
  const defaults = savedTeamDefaults(pack.id);
  const [showForm, setShowForm] = useState(!savedTeam);
  const [name, setName] = useState(defaults.name);
  const [pathId, setPathId] = useState(pack.paths.some(p => p.id === defaults.pathId) ? defaults.pathId : pack.paths[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const clean = cleanTeamName(name);
    if (!clean) { setError('Add a team name. It’s how the leader will see your photos.'); return; }
    setBusy(true);
    setError(null);
    try {
      const result = await joinReview(access, clean, pathId || undefined);
      onJoined(result.access, result.snapshot);
      openReview(result.access);
    } catch (err) {
      setError(describeError(err));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="sticker-card overflow-hidden">
        <div className="border-b-2 border-ink p-4 sm:p-5" style={{ backgroundColor: pack.library.soft }}>
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink/70">You’re invited</p>
          <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{event.title}</h1>
          <div className="mt-3 flex items-center gap-3">
            <PackBadge pack={pack} size="sm" />
            <div className="min-w-0">
              <p className="font-display text-lg leading-tight">{pack.title}</p>
              <p className="text-sm font-semibold text-ink/70">Open until {formatExpiry(event.expiresAt)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {savedTeam && (
            <div className="mb-4">
              <p className="font-bold">This device already joined this event.</p>
              <button
                type="button"
                onClick={() => openReview(savedTeam.access)}
                className="btn-3d btn-go mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl tracking-wide text-ink"
              >
                Continue as your team <ArrowRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
              </button>
              {!showForm && !event.closed && (
                <button type="button" onClick={() => setShowForm(true)} className="mx-auto mt-3 block min-h-11 px-3 text-sm font-extrabold text-ink/70 underline underline-offset-4 hover:text-ink">
                  Join as a different team on this phone
                </button>
              )}
            </div>
          )}

          {event.closed ? (
            <Notice tone="warn">
              <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> The leader has closed this event to new teams and uploads.</span>
            </Notice>
          ) : showForm && (
            <form onSubmit={join} noValidate>
              {savedTeam && <p className="mb-3 text-sm font-semibold text-ink/70">Joining again replaces the saved team on this phone. Photos already sent stay with the old team.</p>}
              <label htmlFor={ids.name} className="flex items-baseline justify-between font-display text-xl">
                Team name <span className="font-body text-sm font-bold text-ink/60">Shown to the leader</span>
              </label>
              <input
                id={ids.name}
                value={name}
                maxLength={TEAM_NAME_LIMIT}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. The Lost Sheep"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="go"
                className="mt-1.5 block min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-4 text-lg font-bold placeholder:font-semibold placeholder:text-ink/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/40"
              />

              <fieldset className="mt-4">
                <legend id={ids.path} className="font-display text-xl">Your path</legend>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-labelledby={ids.path}>
                  {pack.paths.map(p => ({ id: p.id, label: `Path ${p.id}` })).map(option => {
                    const checked = pathId === option.id;
                    const fill = option.id ? PATH_COLORS[option.id] : '#FFFDF7';
                    return (
                      <label
                        key={option.id || 'none'}
                        className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-ink px-3.5 text-sm font-extrabold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${checked ? 'shadow-[2px_2px_0_0_#2E2459]' : 'opacity-80'}`}
                        style={{ backgroundColor: checked ? fill : '#FFFDF7', color: checked ? readableTextOn(fill) : '#2E2459' }}
                      >
                        <input type="radio" name="sr-path" value={option.id} checked={checked} onChange={() => setPathId(option.id)} className="sr-only" />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <p className="mt-3 text-sm font-semibold text-ink/70">Choose the path your leader assigned, or keep Path A. Your game, team name and path carry into the hunt automatically.</p>
              <p className="mt-4 flex gap-2 rounded-2xl bg-sky-soft p-3 text-sm font-bold leading-snug">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={3} aria-hidden="true" />
                <span>The leader will see your team name and the photos you choose to send. Your photos stay on this phone until you choose to send them.</span>
              </p>

              {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}

              <button
                type="submit"
                disabled={busy}
                className="btn-3d btn-go mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 font-display text-xl tracking-wide text-ink"
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={3} aria-hidden="true" />}
                {busy ? 'Joining…' : 'Join event'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
