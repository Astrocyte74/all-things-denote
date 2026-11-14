import { BookOpen, ExternalLink } from 'lucide-react';
import type { Challenge } from '@/types';

export function ScriptureClue({ clue }: { clue: NonNullable<Challenge['scriptureClue']> }) {
  return <section aria-label={`Scripture clue: ${clue.reference}`} className="mt-4 rounded-2xl border-2 border-ink/20 bg-cream p-4 text-left text-ink">
    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide"><BookOpen className="h-4 w-4" /> Read the scripture · {clue.collection}</p>
    <blockquote className="mt-3 font-semibold leading-relaxed">“{clue.excerpt}”</blockquote>
    <p className="mt-2 text-xs font-bold text-ink/70">Excerpt from {clue.reference}</p>
    <a href={clue.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-extrabold underline underline-offset-4">Read the full passage <ExternalLink className="h-3.5 w-3.5" /><span className="sr-only"> (opens a new tab; needs internet)</span></a>
  </section>;
}
