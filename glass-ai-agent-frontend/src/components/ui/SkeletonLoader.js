import React from 'react';

/**
 * Premium SkeletonLoader Component
 * Provides elegant loading states with shimmer animation
 */
const SkeletonLoader = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '8px',
  variant = 'default',
  count = 1,
  className = '',
  ...props 
}) => {
  const baseStyle = {
    width,
    height,
    borderRadius,
    background: variant === 'dark'
      ? 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)'
      : 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s ease-in-out infinite',
    display: 'inline-block',
    position: 'relative',
    overflow: 'hidden',
  };

  if (count > 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={className}
            style={baseStyle}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={baseStyle}
      {...props}
    />
  );
};

/**
 * SkeletonCard - Pre-styled skeleton for cards
 */
export const SkeletonCard = ({ lines = 3, className = '' }) => {
  return (
    <div
      style={{
        padding: '24px',
        borderRadius: '16px',
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
      className={className}
    >
      <SkeletonLoader width="60%" height="24px" borderRadius="8px" style={{ marginBottom: '16px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            width={index === lines - 1 ? '40%' : '100%'}
            height="16px"
            borderRadius="6px"
          />
        ))}
      </div>
    </div>
  );
};

/**
 * SkeletonTable - Pre-styled skeleton for tables
 */
export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => {
  return (
    <div
      style={{
        borderRadius: '16px',
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        overflow: 'hidden',
      }}
      className={className}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '16px',
          padding: '16px',
          background: '#f8fafc',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        {Array.from({ length: cols }).map((_, index) => (
          <SkeletonLoader key={index} width="80%" height="20px" borderRadius="6px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '16px',
            padding: '16px',
            borderBottom: rowIndex < rows - 1 ? '1px solid rgba(226, 232, 240, 0.5)' : 'none',
          }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} width="70%" height="16px" borderRadius="6px" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;

