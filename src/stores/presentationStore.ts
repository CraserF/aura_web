import { create } from 'zustand';

interface PresentationState {
  title: string;
  slidesHtml: string;
  themeCss: string;
  currentIndex: number;
  isPresenting: boolean;
  slideCount: number;

  setTitle: (title: string) => void;
  setSlides: (html: string) => void;
  setThemeCss: (css: string) => void;
  setCurrentIndex: (index: number) => void;
  setPresenting: (presenting: boolean) => void;
  setSlideCount: (count: number) => void;
  reset: () => void;
}

const initialState = {
  title: 'Untitled Presentation',
  slidesHtml: '',
  themeCss: '',
  currentIndex: 0,
  isPresenting: false,
  slideCount: 0,
};

export const usePresentationStore = create<PresentationState>((set) => ({
  ...initialState,

  setTitle: (title) => set({ title }),
  setSlides: (slidesHtml) => set({ slidesHtml }),
  setThemeCss: (themeCss) => set({ themeCss }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setPresenting: (isPresenting) => set({ isPresenting }),
  setSlideCount: (slideCount) => set({ slideCount }),
  reset: () => set(initialState),
}));
