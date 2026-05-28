/** Framer Motion presets — purposeful, enterprise-grade. */

/* Page-level staggered reveal */
export const pageTransition = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren:   0.04,
    },
  },
};

/* Standard section / card entrance */
export const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type:      'spring',
      stiffness: 400,
      damping:   34,
    },
  },
};

/* Subtle scale-in for modals and dropdowns */
export const scaleIn = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type:      'spring',
      stiffness: 420,
      damping:   28,
    },
  },
};

/* Card hover lift */
export const hoverLift = {
  rest:  { y: 0 },
  hover: {
    y: -3,
    transition: { type: 'spring', stiffness: 420, damping: 26 },
  },
};
