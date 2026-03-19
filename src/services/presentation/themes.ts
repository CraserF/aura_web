/** Built-in themes as CSS strings. AI can also generate custom CSS. */
export const themes = {
  dark: `
    .reveal {
      --r-background-color: #0f172a;
      --r-main-color: #e2e8f0;
      --r-heading-color: #f8fafc;
      --r-link-color: #818cf8;
      --r-link-color-hover: #a5b4fc;
      --r-main-font: 'Inter', 'SF Pro Display', system-ui, sans-serif;
      --r-heading-font: 'Inter', 'SF Pro Display', system-ui, sans-serif;
      --r-heading-font-weight: 700;
      --r-main-font-size: 28px;
    }
    .reveal section {
      background: var(--r-background-color);
    }
  `,
  light: `
    .reveal {
      --r-background-color: #ffffff;
      --r-main-color: #334155;
      --r-heading-color: #0f172a;
      --r-link-color: #6366f1;
      --r-link-color-hover: #4f46e5;
      --r-main-font: 'Inter', 'SF Pro Display', system-ui, sans-serif;
      --r-heading-font: 'Inter', 'SF Pro Display', system-ui, sans-serif;
      --r-heading-font-weight: 700;
      --r-main-font-size: 28px;
    }
  `,
  gradient: `
    .reveal {
      --r-main-color: #f1f5f9;
      --r-heading-color: #ffffff;
      --r-link-color: #fbbf24;
      --r-link-color-hover: #f59e0b;
      --r-main-font: 'Inter', 'SF Pro Display', system-ui, sans-serif;
      --r-heading-font: 'Inter', 'SF Pro Display', system-ui, sans-serif;
      --r-heading-font-weight: 700;
      --r-main-font-size: 28px;
    }
    .reveal section {
      background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca);
    }
  `,
} as const;

export type ThemeId = keyof typeof themes;
