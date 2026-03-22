import Reveal from 'reveal.js';
import { AnimationEnginePlugin, ThreeBackgroundPlugin } from './plugins';

export interface DeckInstance {
  reveal: InstanceType<typeof Reveal>;
  container: HTMLElement;
}

/** Initialize a reveal.js deck inside a container element */
export async function initDeck(
  container: HTMLElement,
  initialHtml?: string,
): Promise<DeckInstance> {
  // Set up the reveal structure
  container.classList.add('reveal');

  let slidesEl = container.querySelector('.slides') as HTMLElement | null;
  if (!slidesEl) {
    slidesEl = document.createElement('div');
    slidesEl.className = 'slides';
    container.appendChild(slidesEl);
  }

  if (initialHtml) {
    slidesEl.innerHTML = initialHtml;
  } else {
    // Default empty slide
    slidesEl.innerHTML = '<section></section>';
  }

  const deck = new Reveal(container, {
    embedded: true,
    hash: false,
    history: false,
    controls: true,
    progress: true,
    center: true,
    transition: 'slide',
    backgroundTransition: 'fade',
    width: 1920,
    height: 1080,
    margin: 0.04,
    minScale: 0.2,
    maxScale: 2.0,
    keyboard: true,
    overview: false,
    touch: true,
    plugins: [AnimationEnginePlugin, ThreeBackgroundPlugin],
  });

  await deck.initialize();

  return { reveal: deck, container };
}

/** Replace all slide content and re-sync the deck */
export function updateContent(
  deck: DeckInstance,
  slidesHtml: string,
  options?: { preservePosition?: boolean },
): void {
  const slidesEl = deck.container.querySelector('.slides');
  if (!slidesEl) return;

  const currentH = options?.preservePosition
    ? deck.reveal.getIndices().h
    : 0;

  slidesEl.innerHTML = slidesHtml;
  deck.reveal.sync();

  const totalSlides = deck.reveal.getTotalSlides();
  const targetIndex = Math.min(currentH, Math.max(0, totalSlides - 1));
  deck.reveal.slide(targetIndex);
}

/** Navigate to a specific slide by horizontal index */
export function navigateTo(deck: DeckInstance, index: number): void {
  deck.reveal.slide(index);
}

/** Get the current horizontal slide index */
export function getCurrentIndex(deck: DeckInstance): number {
  const indices = deck.reveal.getIndices();
  return indices.h;
}

/** Get total number of horizontal slides */
export function getSlideCount(deck: DeckInstance): number {
  return deck.reveal.getTotalSlides();
}

/** Enter fullscreen presentation mode */
export function enterFullscreen(deck: DeckInstance): void {
  deck.reveal.configure({
    controls: true,
    progress: true,
    embedded: false,
  });

  deck.container.requestFullscreen?.().catch(() => {});
  deck.reveal.layout();
}

/** Exit fullscreen */
export function exitFullscreen(deck: DeckInstance | null): void {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  if (deck) {
    deck.reveal.configure({ embedded: true });
    deck.reveal.layout();
  }
}

/** Destroy a deck instance */
export function destroyDeck(deck: DeckInstance): void {
  deck.reveal.destroy();
}
