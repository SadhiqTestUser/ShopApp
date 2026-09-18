import type { Variants } from 'framer-motion';

// Shared framer-motion presets used across the app so animations stay
// consistent. Keep these small and composable.

// Fade + rise. Good default for text blocks, cards, and section content.
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Simple fade for subtle entrances.
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

// Gentle scale + fade, e.g. for hero images / previews.
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Parent that staggers its children's `show` state. Pair with any of the
// item variants above on the children.
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

// Interaction presets for cards (e.g. product "View Product" tiles).
export const hoverLift = {
  y: -6,
  transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
};

// Interaction preset for pressable elements (buttons, cards).
export const tapScale = { scale: 0.97 };

// Slightly stronger press for primary buttons.
export const buttonHover = {
  scale: 1.03,
  transition: { type: 'spring' as const, stiffness: 400, damping: 17 },
};

// Viewport config for scroll-reveal: animate once when ~15% is visible.
export const revealViewport = { once: true, amount: 0.15 } as const;
