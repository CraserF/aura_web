declare module 'reveal.js' {
  interface RevealPlugin {
    id: string;
    init: (deck: any) => void;
  }

  interface RevealOptions {
    embedded?: boolean;
    hash?: boolean;
    history?: boolean;
    controls?: boolean;
    progress?: boolean;
    center?: boolean;
    transition?: string;
    backgroundTransition?: string;
    width?: number;
    height?: number;
    margin?: number;
    minScale?: number;
    maxScale?: number;
    keyboard?: boolean;
    overview?: boolean;
    touch?: boolean;
    plugins?: RevealPlugin[];
  }

  interface RevealIndices {
    h: number;
    v: number;
    f?: number;
  }

  class Reveal {
    constructor(container: HTMLElement, options?: RevealOptions);
    initialize(): Promise<void>;
    sync(): void;
    slide(h: number, v?: number, f?: number): void;
    getIndices(): RevealIndices;
    getTotalSlides(): number;
    configure(options: Partial<RevealOptions>): void;
    layout(): void;
    destroy(): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    off(event: string, callback: (...args: unknown[]) => void): void;
    getSlides(): HTMLElement[];
    getCurrentSlide(): HTMLElement | undefined;
  }

  export default Reveal;
}
