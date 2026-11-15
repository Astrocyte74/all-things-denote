import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { ArrowLeft, Camera, ChevronRight, CloudUpload, Home, ListChecks, Menu, PencilLine, RotateCcw, Settings2 } from 'lucide-react';
import type { EventHunt } from '@/lib/eventHunt';
import { PhotoAutoSendControl } from './shared-review/PhotoAutoSendControl';

interface HuntMenuProps {
  triggerRef: RefObject<HTMLButtonElement | null>;
  photoCount: number;
  onGallery: () => void;
  onChecklist?: () => void;
  eventHunt?: EventHunt | null;
  onEvent?: () => void;
  onEditTeam?: () => void;
  onStartOver: () => void;
  onHome: () => void;
}
const item = 'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left outline-none focus:bg-grape-soft';

/** One predictable menu in both hunt views. Routine tools stay together; leaving
 * or resetting takes a second, explicitly named step. Modal tools return here. */
export function HuntMenu({ triggerRef, photoCount, onGallery, onChecklist, eventHunt, onEvent, onEditTeam, onStartOver, onHome }: HuntMenuProps) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const back = useRef<HTMLDivElement>(null);
  const moreItem = useRef<HTMLDivElement>(null);
  const openingTool = useRef(false);
  const stay = useRef<HTMLButtonElement>(null);
  const restoreFocus = () => triggerRef.current?.focus({ preventScroll: true });
  useLayoutEffect(() => { if (open && more) back.current?.focus(); }, [open, more]);

  return <>
    <DropdownMenu.Root open={open} onOpenChange={value => { setOpen(value); if (!value) setMore(false); }}>
      <DropdownMenu.Trigger asChild>
        <button ref={triggerRef} aria-label="Hunt menu" className="btn-3d btn-white inline-flex min-h-11 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold text-ink">
          <Menu className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" /> Menu
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content aria-label="Hunt menu" align="end" sideOffset={10} collisionPadding={12}
          onCloseAutoFocus={e => { if (sharing || leaving || openingTool.current) e.preventDefault(); openingTool.current = false; }}
          className="sticker-card z-[65] max-h-[var(--radix-dropdown-menu-content-available-height)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto p-2 text-sm font-extrabold text-ink">
          {more ? <>
            <DropdownMenu.Item ref={back} onSelect={e => { e.preventDefault(); setMore(false); requestAnimationFrame(() => moreItem.current?.focus()); }} className={item}>
              <ArrowLeft className="h-4 w-4" /> Back to hunt menu
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 border-t border-ink/15" />
            {onEditTeam && <DropdownMenu.Item onSelect={() => { openingTool.current = true; onEditTeam(); }} className={item}><PencilLine className="h-4 w-4" /> Edit team & path</DropdownMenu.Item>}
            <DropdownMenu.Item aria-label="Start over" onSelect={() => { openingTool.current = true; onStartOver(); }} className={item}><RotateCcw className="h-4 w-4" /><span>Start over<span className="block text-xs font-semibold text-ink/60">Choose what to reset first</span></span></DropdownMenu.Item>
            <DropdownMenu.Item aria-label="Back to home" onSelect={() => setLeaving(true)} className={item}><Home className="h-4 w-4" /><span>Back to home<span className="block text-xs font-semibold text-ink/60">Leave the hunt; keep your progress</span></span></DropdownMenu.Item>
          </> : <>
            <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs uppercase tracking-wide text-ink/55">Hunt tools</DropdownMenu.Label>
            <DropdownMenu.Item aria-label="Photo gallery" onSelect={() => { openingTool.current = true; onGallery(); }} className={item}>
              <Camera className="h-4 w-4" /><span className="flex-1">Photo gallery<span className="block text-xs font-semibold text-ink/60">Photos saved on this phone</span></span><span className="text-ink/60">{photoCount}</span>
            </DropdownMenu.Item>
            {eventHunt && <DropdownMenu.Item aria-label="Photo sharing" onSelect={() => setSharing(true)} className={item}>
              <CloudUpload className="h-4 w-4" /><span>Photo sharing<span className="block text-xs font-semibold text-ink/60">Auto-send and event uploads</span></span>
            </DropdownMenu.Item>}
            {onChecklist && <DropdownMenu.Item aria-label="Hunt checklist" onSelect={onChecklist} className={item}>
              <ListChecks className="h-4 w-4" /><span>Hunt checklist<span className="block text-xs font-semibold text-ink/60">Browse all clues; return to this one</span></span>
            </DropdownMenu.Item>}
            <DropdownMenu.Separator className="my-1 border-t border-ink/15" />
            <DropdownMenu.Item ref={moreItem} aria-label="More options" onSelect={e => { e.preventDefault(); setMore(true); }} className={`${item} text-ink/70`}>
              <Settings2 className="h-4 w-4" /><span className="flex-1">More options</span><ChevronRight className="h-4 w-4" />
            </DropdownMenu.Item>
          </>}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>

    {eventHunt && <PhotoAutoSendControl hunt={eventHunt} onOpenEvent={onEvent} dialogState={{ open: sharing, onOpenChange: setSharing, restoreFocus }} />}

    <AlertDialog.Root open={leaving} onOpenChange={setLeaving}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[75] bg-ink/60" />
        <AlertDialog.Content onOpenAutoFocus={e => { e.preventDefault(); stay.current?.focus(); }} onCloseAutoFocus={e => { e.preventDefault(); restoreFocus(); }} className="sticker-card fixed left-1/2 top-1/2 z-[76] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-5 text-ink">
          <AlertDialog.Title className="font-display text-2xl">Leave this hunt?</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 font-semibold text-ink/75">Your progress and photos stay saved on this device. You can continue {eventHunt ? `${eventHunt.team.name}’s hunt` : 'this hunt'} from Home.</AlertDialog.Description>
          <div className="mt-5 flex flex-col gap-3">
            <AlertDialog.Cancel ref={stay} className="btn-3d btn-go min-h-12 rounded-2xl px-4 font-extrabold">Stay in hunt</AlertDialog.Cancel>
            <AlertDialog.Action onClick={onHome} className="min-h-11 rounded-xl px-4 font-bold underline underline-offset-4">Go to home</AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  </>;
}
