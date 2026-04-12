import { useEffect, useRef, useCallback } from 'react';
import { Monitor, ChevronLeft, ChevronRight, Maximize } from 'lucide-react';
import { usePresentationStore } from '@/stores/presentationStore';
import { useChatStore } from '@/stores/chatStore';
import { Button } from '@/components/ui/button';
import {
  initDeck,
  updateContent,
  navigateTo,
  getCurrentIndex,
  getSlideCount,
  destroyDeck,
  type DeckInstance,
} from '@/services/presentation/engine';

interface LockableScreenOrientation {
  lock?: (orientation: 'any' | 'natural' | 'portrait' | 'landscape' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary') => Promise<void>;
  unlock?: () => void;
}

async function lockLandscapeOrientation(): Promise<void> {
  const orientation = (screen.orientation ?? null) as LockableScreenOrientation | null;
  if (!orientation?.lock) return;
  try {
    await orientation.lock('landscape');
  } catch {
    // Locking is browser/device restricted (notably on iOS Safari). Ignore safely.
  }
}

function unlockOrientation(): void {
  const orientation = (screen.orientation ?? null) as LockableScreenOrientation | null;
  if (!orientation?.unlock) return;
  try {
    orientation.unlock();
  } catch {
    // Ignore failures; unlock support is browser/device dependent.
  }
}

export function PresentationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<DeckInstance | null>(null);
  const initPending = useRef(false);

  const slidesHtml = usePresentationStore((s) => s.slidesHtml);
  const currentIndex = usePresentationStore((s) => s.currentIndex);
  const setCurrentIndex = usePresentationStore((s) => s.setCurrentIndex);
  const setSlideCount = usePresentationStore((s) => s.setSlideCount);
  const isPresenting = usePresentationStore((s) => s.isPresenting);
  const setPresenting = usePresentationStore((s) => s.setPresenting);

  // Initialize or re-init the deck whenever we have a container + content
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !slidesHtml) return;

    // If deck already exists, just update content
    if (deckRef.current) {
      const isGenerating = useChatStore.getState().status.state === 'generating';
      updateContent(deckRef.current, slidesHtml, { preservePosition: isGenerating });
      setSlideCount(getSlideCount(deckRef.current));
      return;
    }

    // Prevent double init
    if (initPending.current) return;
    initPending.current = true;

    initDeck(container, slidesHtml).then((deck) => {
      initPending.current = false;
      deckRef.current = deck;
      setSlideCount(getSlideCount(deck));

      deck.reveal.on('slidechanged', () => {
        setCurrentIndex(getCurrentIndex(deck));
      });
    });

    return () => {
      initPending.current = false;
      if (deckRef.current) {
        destroyDeck(deckRef.current);
        deckRef.current = null;
      }
    };
  }, [slidesHtml, setSlideCount, setCurrentIndex]);

  // Sync navigation from store → deck
  const lastSyncedIndex = useRef(currentIndex);
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    if (currentIndex !== lastSyncedIndex.current) {
      navigateTo(deck, currentIndex);
      lastSyncedIndex.current = currentIndex;
    }
  }, [currentIndex]);

  // Handle fullscreen presentation mode
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !deckRef.current) return;

    if (isPresenting) {
      container.classList.remove('aura-edit-mode');
      container.classList.add('aura-present-mode');

      deckRef.current.reveal.configure({
        controls: true,
        progress: true,
        embedded: false,
      });

      void (async () => {
        try {
          if (!document.fullscreenElement) {
            await container.requestFullscreen?.();
          }
        } catch {
          // Ignore fullscreen failures; user gesture or browser policy may block it.
        }

        await lockLandscapeOrientation();
        deckRef.current?.reveal.layout();
      })();
    } else {
      container.classList.remove('aura-present-mode');
      container.classList.add('aura-edit-mode');

      deckRef.current.reveal.configure({
        controls: true,
        progress: true,
        embedded: true,
      });

      unlockOrientation();

      if (document.fullscreenElement === container) {
        document.exitFullscreen().catch(() => {});
      }

      deckRef.current.reveal.layout();
    }
  }, [isPresenting]);

  // Listen for fullscreen exit (e.g. Escape key from browser) → sync state
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && isPresenting) {
        unlockOrientation();
        setPresenting(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isPresenting, setPresenting]);

  const goToSlide = useCallback(
    (index: number) => {
      const deck = deckRef.current;
      if (!deck) return;
      navigateTo(deck, index);
      setCurrentIndex(index);
    },
    [setCurrentIndex],
  );

  const handlePresent = useCallback(() => {
    setPresenting(true);
  }, [setPresenting]);

  return (
    <section className="aura-canvas-shell aura-presentation-shell">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {slidesHtml ? (
          <div className="aura-canvas-frame aura-presentation-frame">
            <div
              ref={containerRef}
              className="h-full w-full aura-edit-mode aura-presentation-root"
            />
            <SlideNavOverlay
              currentIndex={currentIndex}
              goToSlide={goToSlide}
              onPresent={handlePresent}
            />
          </div>
        ) : (
          <>
            {/* Hidden container so reveal can mount once content arrives */}
            <div ref={containerRef} className="hidden" />
            <EmptyState />
          </>
        )}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
        <Monitor size={24} strokeWidth={1.5} className="text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-medium text-foreground">
          Start with a prompt
        </p>
        <p className="text-sm text-muted-foreground">
          Describe your presentation in the chat below and Aura will generate the slides.
        </p>
      </div>
    </div>
  );
}

function SlideNavOverlay({
  currentIndex,
  goToSlide,
  onPresent,
}: {
  currentIndex: number;
  goToSlide: (index: number) => void;
  onPresent: () => void;
}) {
  const slideCount = usePresentationStore((s) => s.slideCount);
  if (slideCount <= 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-background px-1.5 py-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 rounded-md text-muted-foreground"
        onClick={() => goToSlide(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        aria-label="Previous slide"
      >
        <ChevronLeft size={14} />
      </Button>
      <span className="px-2 text-xs tabular-nums text-muted-foreground">
        {currentIndex + 1} / {slideCount}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 rounded-md text-muted-foreground"
        onClick={() => goToSlide(Math.min(slideCount - 1, currentIndex + 1))}
        disabled={currentIndex >= slideCount - 1}
        aria-label="Next slide"
      >
        <ChevronRight size={14} />
      </Button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="size-7 rounded-md text-muted-foreground hover:text-foreground"
        onClick={onPresent}
        aria-label="Present fullscreen"
      >
        <Maximize size={13} />
      </Button>
    </div>
  );
}
