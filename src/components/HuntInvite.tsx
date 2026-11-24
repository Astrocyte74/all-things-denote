import { useState } from 'react';
import type { EventHunt } from '@/lib/eventHunt';
import { reviewLink } from '@/lib/sharedReview';
import { QrImage } from './shared-review/ui';

export function HuntInvite({ hunt }: { hunt?: EventHunt | null }) {
  const [openedAt] = useState(Date.now);
  if (hunt && hunt.event.expiresAt <= openedAt) {
    return <p className="mt-3 font-semibold">This event is closed to new teams.</p>;
  }
  if (hunt && !hunt.joinToken) {
    return <p className="mt-3 font-semibold">Ask the leader to show the team invite QR code from this event.</p>;
  }
  const link = hunt?.joinToken
    ? reviewLink({ role: 'join', eventId: hunt.event.id, token: hunt.joinToken })
    : new URL(import.meta.env.BASE_URL, location.origin).href;
  return <div className="mt-3 flex flex-col items-center gap-3">
    <QrImage value={link} label={hunt ? 'QR code to join this event' : 'QR code to open the game library'} className="h-40 w-40 border-2 border-ink bg-white" />
    <p className="text-center text-sm font-semibold">{hunt ? 'Scan to join this event on another phone.' : 'Scan to open the game library on another phone.'}</p>
    <a className="break-all text-center text-sm font-bold text-ink underline" href={link}>{hunt ? 'Open team invite link' : 'Open game library'}</a>
  </div>;
}
