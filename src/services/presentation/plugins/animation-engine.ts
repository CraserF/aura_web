/**
 * RevealJS Animation Engine Plugin (TypeScript Port)
 * ====================================================
 * Runtime animation helpers that complement the CSS animation libraries.
 *
 * Features:
 *   1. Auto-stagger -- automatically delays .fragment children on slide entry
 *   2. Number counters -- animates numbers from 0 to data-target
 *   3. Progress bars -- animates fill width on slide entry
 *   4. Typed text -- one-character-at-a-time typing effect (JS-driven)
 *   5. Slide-aware pause/resume -- stops looping animations on hidden slides
 *
 * HTML hooks:
 *   Auto-stagger:   <ul data-auto-stagger="150">  (delay in ms between items)
 *   Counter:         <span class="number-counter" data-target="1500" data-duration="2000">0</span>
 *   Progress bar:    <div class="progress-bar-animated"><div class="fill" style="--target-width:80%"></div></div>
 *   Typed text:      <span data-typed="Hello, World!" data-typed-speed="50"></span>
 */

interface SlideChangedEvent {
  currentSlide?: HTMLElement;
  previousSlide?: HTMLElement;
}

interface ReadyEvent {
  currentSlide?: HTMLElement;
}

export const AnimationEnginePlugin = {
  id: 'animation-engine',

  init(deck: any): void {
    // =====================
    // 1. Auto-Stagger
    // =====================
    function applyAutoStagger(slide: HTMLElement): void {
      const containers = slide.querySelectorAll<HTMLElement>('[data-auto-stagger]');
      containers.forEach((container) => {
        const delay = parseInt(container.getAttribute('data-auto-stagger') || '150', 10);
        const children = container.querySelectorAll<HTMLElement>('.fragment');
        children.forEach((child, i) => {
          child.style.transitionDelay = `${i * delay}ms`;
        });
      });
    }

    // =====================
    // 2. Number Counters
    // =====================
    function animateCounters(slide: HTMLElement): void {
      const counters = slide.querySelectorAll<HTMLElement>('.number-counter[data-target]');
      counters.forEach((el) => {
        const target = parseFloat(el.getAttribute('data-target') || '0');
        const duration = parseInt(el.getAttribute('data-duration') || '2000', 10);
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);

        if (isNaN(target)) return;

        const start = performance.now();
        el.classList.add('counting');

        function tick(now: number): void {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = eased * target;

          el.textContent = prefix + current.toFixed(decimals) + suffix;

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            el.textContent = prefix + target.toFixed(decimals) + suffix;
            el.classList.remove('counting');
            el.classList.add('counted');
          }
        }

        requestAnimationFrame(tick);
      });
    }

    function resetCounters(slide: HTMLElement): void {
      const counters = slide.querySelectorAll<HTMLElement>('.number-counter[data-target]');
      counters.forEach((el) => {
        el.classList.remove('counted', 'counting');
        el.textContent = el.getAttribute('data-prefix') || '0';
      });
    }

    // =====================
    // 3. Progress Bars
    // =====================
    function animateProgressBars(slide: HTMLElement): void {
      const bars = slide.querySelectorAll<HTMLElement>('.progress-bar-animated .fill');
      bars.forEach((fill) => {
        // Reset first, then trigger fill
        fill.style.transition = 'none';
        fill.style.width = '0%';
        // Force reflow
        void fill.offsetWidth;
        fill.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
        fill.style.width = getComputedStyle(fill).getPropertyValue('--target-width') || '100%';
      });
    }

    function resetProgressBars(slide: HTMLElement): void {
      const bars = slide.querySelectorAll<HTMLElement>('.progress-bar-animated .fill');
      bars.forEach((fill) => {
        fill.style.transition = 'none';
        fill.style.width = '0%';
      });
    }

    // =====================
    // 4. Typed Text
    // =====================
    const activeTypedAnimations = new Map<HTMLElement, ReturnType<typeof setInterval>>();

    function animateTypedText(slide: HTMLElement): void {
      const elements = slide.querySelectorAll<HTMLElement>('[data-typed]');
      elements.forEach((el) => {
        const text = el.getAttribute('data-typed');
        const speed = parseInt(el.getAttribute('data-typed-speed') || '50', 10);
        const cursor = el.getAttribute('data-typed-cursor') !== 'false';

        if (!text) return;

        el.textContent = '';
        if (cursor) el.classList.add('typed-cursor');

        let i = 0;
        const intervalId = setInterval(() => {
          if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
          } else {
            clearInterval(intervalId);
            activeTypedAnimations.delete(el);
            if (cursor) {
              // Keep cursor blinking for a moment, then remove
              setTimeout(() => el.classList.remove('typed-cursor'), 2000);
            }
          }
        }, speed);

        activeTypedAnimations.set(el, intervalId);
      });
    }

    function resetTypedText(slide: HTMLElement): void {
      const elements = slide.querySelectorAll<HTMLElement>('[data-typed]');
      elements.forEach((el) => {
        if (activeTypedAnimations.has(el)) {
          clearInterval(activeTypedAnimations.get(el)!);
          activeTypedAnimations.delete(el);
        }
        el.textContent = '';
        el.classList.remove('typed-cursor');
      });
    }

    // =====================
    // 5. Slide-Aware Pause/Resume
    // =====================
    function pauseAnimations(slide: HTMLElement): void {
      const animated = slide.querySelectorAll<HTMLElement>('[class*="anim-"], [class*="scene-"]');
      animated.forEach((el) => {
        el.style.animationPlayState = 'paused';
      });
    }

    function resumeAnimations(slide: HTMLElement): void {
      const animated = slide.querySelectorAll<HTMLElement>('[class*="anim-"], [class*="scene-"]');
      animated.forEach((el) => {
        el.style.animationPlayState = 'running';
      });
    }

    // =====================
    // Inject typed-cursor CSS
    // =====================
    const style = document.createElement('style');
    style.textContent = `
      .typed-cursor::after {
        content: '|';
        animation: typedBlink 0.7s infinite;
        margin-left: 1px;
      }
      @keyframes typedBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    // =====================
    // Event Wiring
    // =====================
    deck.on('slidechanged', (event: SlideChangedEvent) => {
      const { currentSlide, previousSlide } = event;

      // Leaving a slide
      if (previousSlide) {
        pauseAnimations(previousSlide);
        resetCounters(previousSlide);
        resetProgressBars(previousSlide);
        resetTypedText(previousSlide);
      }

      // Entering a slide
      if (currentSlide) {
        applyAutoStagger(currentSlide);
        resumeAnimations(currentSlide);
        animateCounters(currentSlide);
        animateProgressBars(currentSlide);
        animateTypedText(currentSlide);
      }
    });

    // Run once for the initial slide
    deck.on('ready', (event: ReadyEvent) => {
      const slide = event.currentSlide;
      if (slide) {
        applyAutoStagger(slide);
        animateCounters(slide);
        animateProgressBars(slide);
        animateTypedText(slide);
      }
    });
  },
};
