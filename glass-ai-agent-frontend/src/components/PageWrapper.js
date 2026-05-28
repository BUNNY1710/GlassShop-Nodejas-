import { motion } from 'framer-motion';
import { pageTransition } from '../design/motion';
import { cn } from '../lib/utils';

function PageWrapper({ children, className, maxWidth = '7xl' }) {
  const maxWidths = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    '7xl': 'max-w-[1400px]',
    full: 'max-w-full',
  };

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      className={cn('page-container page-section', maxWidths[maxWidth] || maxWidths['7xl'], className)}
    >
      {children}
    </motion.div>
  );
}

export default PageWrapper;
