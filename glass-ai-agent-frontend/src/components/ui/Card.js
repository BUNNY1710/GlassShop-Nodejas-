import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  onClick, 
  hover = false,
  gradient = false,
  glass = false,
  padding = 'lg',
  ...props 
}) => {
  const baseStyle = {
    background: glass 
      ? 'rgba(255, 255, 255, 0.7)' 
      : gradient 
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        : '#ffffff',
    backdropFilter: glass ? 'blur(20px) saturate(180%)' : 'none',
    WebkitBackdropFilter: glass ? 'blur(20px) saturate(180%)' : 'none',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: glass ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(226, 232, 240, 0.8)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
    padding: padding === 'sm' ? '16px' : padding === 'md' ? '24px' : padding === 'lg' ? '32px' : padding,
    position: 'relative',
    overflow: 'hidden',
  };

  const hoverStyle = hover || onClick ? {
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    }
  } : {};

  return (
    <div
      className={`card ${className}`}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        }
      }}
      onMouseLeave={(e) => {
        if (hover || onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

