import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(({
  children,
  className,
  onClick,
  hover = false,
  glass = false,
  glow = false,
  padding = 'lg',
  ...props
}, ref) => {

  const paddingStyles = {
    none: 'p-0',
    sm:   'p-4 md:p-5',
    md:   'p-5 md:p-6',
    lg:   'p-6 md:p-7',
  };

  const base = cn(
    'relative rounded-xl overflow-hidden transition-all duration-200',
    /* Clean surface — no heavy glassmorphism */
    'bg-white dark:bg-slate-900',
    'border border-slate-200 dark:border-slate-800',
    'shadow-card',
    hover && 'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
    paddingStyles[padding],
    className
  );

  if (hover || onClick) {
    return (
      <motion.div
        ref={ref}
        onClick={onClick}
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        className={base}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div ref={ref} className={base} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';
export default Card;
