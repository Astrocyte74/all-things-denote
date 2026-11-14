import { readableTextOn } from '@/lib/theme';
import { cleanTeamName } from './teamName';

/**
 * Keepsake photo card: the whole photo on warm paper with an ink sticker
 * outline, and a caption below it (clue badge, title, scripture, team and
 * path, game and date). Drawn to a canvas so the design survives
 * download, share and ZIP export.
 */

export interface PhotoCardDetails {
  number: number;
  title: string;
  /** Scripture reference shown under the title. */
  scripture?: string;
  /** Theme accent (the category's main color). */
  accent: string;
  teamName?: string;
  pathId?: string;
  /** Game title for the small footer line. */
  gameTitle?: string;
  date?: Date;
}

const INK = '#2E2459';
const PAPER = '#FDF6EC';
const CREAM = '#FFFDF7';
const DISPLAY = '"Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif';
const BODY = 'Figtree, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Same colors as the path cards on the path-selection screen. */
const PATH_COLORS: Record<string, string> = {
  A: '#FFB020',
  B: '#FF6B6B',
  C: '#38B6FF',
  D: '#2FBF71',
  E: '#7A6CF0',
  F: '#FF9DE2',
};

const MAX_EDGE = 1920; // longest photo edge stored
const MIN_WIDTH = 720; // small photos are scaled up so the caption stays crisp

/**
 * Make sure the bundled fonts are ready before drawing; canvas text silently
 * falls back otherwise. The fonts are bundled by @fontsource and precached by
 * the service worker, so this works offline. Never blocks longer than
 * `timeoutMs`; drawing then uses the system fallbacks.
 */
export async function loadCardFonts(timeoutMs = 2500): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const faces = [`400 64px "Lilita One"`, '800 32px Figtree', '700 32px Figtree', '600 32px Figtree'];
  const loads = Promise.all(faces.map(face => document.fonts.load(face).catch(() => [])));
  await Promise.race([loads, new Promise(resolve => setTimeout(resolve, timeoutMs))]);
}

/** Draw the keepsake card for a loaded image. Returns a new canvas. */
export function drawPhotoCard(image: CanvasImageSource, sourceWidth: number, sourceHeight: number, details: PhotoCardDetails): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process this photo.');

  // ── Photo size: whole image, never cropped ────────────────────────────────
  const scale = Math.min(MAX_EDGE / sourceWidth, MAX_EDGE / sourceHeight, Math.max(1, MIN_WIDTH / sourceWidth));
  const photoW = Math.max(1, Math.round(sourceWidth * scale));
  const photoH = Math.max(1, Math.round(sourceHeight * scale));
  const innerW = Math.max(photoW, MIN_WIDTH); // panoramas sit centered on paper
  const landscape = photoW > photoH * 1.15;
  // One layout unit; landscape cards use a slightly smaller unit so the
  // caption stays proportionate to the shorter photo.
  const u = innerW / (landscape ? 110 : 100);

  const pad = 4.5 * u;
  const stroke = Math.max(2, 0.55 * u);
  const shadow = 0.9 * u;
  const photoX = pad + (innerW - photoW) / 2;
  const photoY = pad;
  const width = Math.round(innerW + pad * 2);

  // ── Caption measurements ─────────────────────────────────────────────────
  const badge = 13.5 * u;
  const badgeGap = 3.4 * u;
  const textX = pad + badge + badgeGap;
  const textW = innerW - badge - badgeGap;

  const titleSize = 6 * u;
  const titleLH = titleSize * 1.1;
  ctx.font = `400 ${titleSize}px ${DISPLAY}`;
  const titleLines = wrapText(ctx, details.title.trim() || `Clue ${details.number}`, textW);

  const scriptureSize = 3.9 * u;
  const scriptureLH = scriptureSize * 1.28;
  const scriptureGap = 1.2 * u;
  ctx.font = `700 ${scriptureSize}px ${BODY}`;
  // Scripture Detectives titles *are* the reference; never print it twice.
  const scripture = details.scripture?.trim();
  const showScripture = scripture && normalize(scripture) !== normalize(details.title);
  const scriptureLines = showScripture ? wrapText(ctx, scripture, textW) : [];

  const textBlockH = titleLines.length * titleLH + (scriptureLines.length ? scriptureGap + scriptureLines.length * scriptureLH : 0);
  const headRowH = Math.max(badge, textBlockH);

  // Footer: team + path pills (left), game + date (right or wrapped below).
  const pillSize = 3.6 * u;
  const pillLH = pillSize * 1.2;
  const pillPadX = 2.6 * u;
  const pillPadY = 1.2 * u;
  const pillGap = 1.6 * u;
  ctx.font = `800 ${pillSize}px ${BODY}`;
  const team = cleanTeamName(details.teamName);
  const pills: Pill[] = [];
  if (team) pills.push(makePill(ctx, team, CREAM, innerW, pillPadX, pillPadY, pillLH));
  if (details.pathId) {
    const fill = PATH_COLORS[details.pathId] ?? '#FFB020';
    pills.push(makePill(ctx, `Path ${details.pathId}`, fill, innerW, pillPadX, pillPadY, pillLH));
  }

  const metaSize = 3.1 * u;
  ctx.font = `700 ${metaSize}px ${BODY}`;
  const dateText = (details.date ?? new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const metaText = [details.gameTitle, dateText].filter(Boolean).join(' · ');
  const metaLines = metaText ? wrapText(ctx, metaText, innerW) : [];
  const metaW = metaLines.length === 1 ? ctx.measureText(metaLines[0]).width : Infinity;
  const metaLH = metaSize * 1.3;

  // Flow the pills, then decide whether the meta line fits beside them.
  const pillRows: { pill: Pill; x: number; y: number }[] = [];
  let px = 0;
  let py = 0;
  let rowH = 0;
  for (const pill of pills) {
    if (px > 0 && px + pill.w > innerW) {
      px = 0;
      py += rowH + pillGap;
      rowH = 0;
    }
    pillRows.push({ pill, x: px, y: py });
    px += pill.w + pillGap;
    rowH = Math.max(rowH, pill.h);
  }
  const pillsH = pills.length ? py + rowH : 0;
  const lastRowEnd = pills.length ? px - pillGap : 0;
  const metaInline = metaLines.length <= 1 && (!pills.length || lastRowEnd + 3 * u + metaW <= innerW);
  const metaH = metaLines.length * metaLH;
  const footerH = metaInline ? Math.max(pillsH, metaH) : pillsH + (pills.length ? 1.4 * u : 0) + metaH;

  const captionTop = photoY + photoH + shadow + 4.4 * u;
  const ruleY = captionTop + headRowH + 3.4 * u;
  const footerTop = ruleY + 3.2 * u;
  const height = Math.round(footerTop + footerH + pad);

  canvas.width = width;
  canvas.height = height;

  // ── Paper ────────────────────────────────────────────────────────────────
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  const dotStep = 2.4 * u;
  const dotR = Math.max(0.8, 0.13 * u);
  ctx.fillStyle = 'rgba(46, 36, 89, 0.07)';
  for (let y = dotStep / 2; y < height; y += dotStep) {
    for (let x = dotStep / 2; x < width; x += dotStep) {
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Photo: hard ink shadow, full image, ink outline ──────────────────────
  const radius = 0.9 * u;
  ctx.fillStyle = INK;
  roundRect(ctx, photoX - stroke / 2 + shadow, photoY - stroke / 2 + shadow, photoW + stroke, photoH + stroke, radius + stroke / 2);
  ctx.fill();
  ctx.save();
  roundRect(ctx, photoX, photoY, photoW, photoH, radius);
  ctx.clip();
  ctx.fillStyle = CREAM;
  ctx.fillRect(photoX, photoY, photoW, photoH);
  ctx.drawImage(image, photoX, photoY, photoW, photoH);
  ctx.restore();
  ctx.lineWidth = stroke;
  ctx.strokeStyle = INK;
  roundRect(ctx, photoX, photoY, photoW, photoH, radius);
  ctx.stroke();

  // ── Clue badge: tilted sticker in the theme color ────────────────────────
  const badgeY = captionTop + (headRowH > badge ? Math.min(0.4 * u, headRowH - badge) : 0);
  ctx.save();
  ctx.translate(pad + badge / 2, badgeY + badge / 2);
  ctx.rotate(-0.07);
  ctx.fillStyle = INK;
  roundRect(ctx, -badge / 2 + 0.8 * u, -badge / 2 + 0.8 * u, badge, badge, 3 * u);
  ctx.fill();
  ctx.fillStyle = details.accent;
  roundRect(ctx, -badge / 2, -badge / 2, badge, badge, 3 * u);
  ctx.fill();
  ctx.lineWidth = stroke;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const numberText = String(details.number);
  const numberSize = (numberText.length > 2 ? 5.2 : 7.2) * u;
  ctx.font = `400 ${numberSize}px ${DISPLAY}`;
  ctx.fillStyle = readableTextOn(details.accent);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberText, 0, 0.35 * u);
  ctx.restore();

  // ── Title + scripture, vertically centered on the badge when short ───────
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let ty = captionTop + Math.max(0, (badge - textBlockH) / 2);
  ctx.fillStyle = INK;
  ctx.font = `400 ${titleSize}px ${DISPLAY}`;
  for (const line of titleLines) {
    ctx.fillText(line, textX, ty + titleSize * 0.86);
    ty += titleLH;
  }
  if (scriptureLines.length) {
    ty += scriptureGap;
    ctx.font = `700 ${scriptureSize}px ${BODY}`;
    ctx.fillStyle = 'rgba(46, 36, 89, 0.74)';
    for (const line of scriptureLines) {
      ctx.fillText(line, textX, ty + scriptureSize * 0.92);
      ty += scriptureLH;
    }
  }

  // ── Dashed rule ──────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(46, 36, 89, 0.22)';
  ctx.lineWidth = Math.max(1.5, 0.28 * u);
  ctx.setLineDash([1.4 * u, 1.1 * u]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pad, ruleY);
  ctx.lineTo(pad + innerW, ruleY);
  ctx.stroke();
  ctx.restore();

  // ── Pills ────────────────────────────────────────────────────────────────
  ctx.font = `800 ${pillSize}px ${BODY}`;
  for (const { pill, x, y } of pillRows) {
    const left = pad + x;
    const top = footerTop + y;
    const r = Math.min(pill.h / 2, 3.2 * u);
    ctx.fillStyle = INK;
    roundRect(ctx, left + 0.5 * u, top + 0.5 * u, pill.w, pill.h, r);
    ctx.fill();
    ctx.fillStyle = pill.fill;
    roundRect(ctx, left, top, pill.w, pill.h, r);
    ctx.fill();
    ctx.lineWidth = Math.max(2, 0.4 * u);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = readableTextOn(pill.fill);
    pill.lines.forEach((line, i) => {
      ctx.fillText(line, left + pillPadX, top + pillPadY + i * pillLH + pillSize * 0.9);
    });
  }

  // ── Game · date ──────────────────────────────────────────────────────────
  if (metaLines.length) {
    ctx.font = `700 ${metaSize}px ${BODY}`;
    ctx.fillStyle = 'rgba(46, 36, 89, 0.6)';
    if (metaInline) {
      const rowHeight = pills.length ? pillRows[pillRows.length - 1].pill.h : metaH;
      const baseTop = pills.length ? footerTop + pillRows[pillRows.length - 1].y : footerTop;
      ctx.textAlign = pills.length ? 'right' : 'left';
      ctx.fillText(metaLines[0], pills.length ? pad + innerW : pad, baseTop + rowHeight / 2 + metaSize * 0.35);
    } else {
      ctx.textAlign = 'left';
      const top = footerTop + pillsH + (pills.length ? 1.4 * u : 0);
      metaLines.forEach((line, i) => ctx.fillText(line, pad, top + i * metaLH + metaSize));
    }
  }

  return canvas;
}

interface Pill {
  lines: string[];
  w: number;
  h: number;
  fill: string;
}

/** A pill that wraps onto extra lines instead of clipping very wide names. */
function makePill(ctx: CanvasRenderingContext2D, text: string, fill: string, maxW: number, padX: number, padY: number, lineH: number): Pill {
  const lines = wrapText(ctx, text, maxW - padX * 2);
  const textW = Math.max(...lines.map(line => ctx.measureText(line).width));
  return { lines, fill, w: textW + padX * 2, h: lines.length * lineH + padY * 2 };
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[\s\u2013\u2014-]+/g, ' ').trim();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Wrap long names and unbroken words as well as ordinary challenge titles. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) { lines.push(line); line = ''; }
    for (const character of Array.from(word)) {
      if (line && ctx.measureText(line + character).width > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}
