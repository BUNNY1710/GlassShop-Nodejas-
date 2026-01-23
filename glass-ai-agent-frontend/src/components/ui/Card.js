import React, { useState } from 'react';

const Card = ({ 
  children, 
  className = '', 
  onClick, 
  hover = false,
  gradient = false,
  glass = false,
  padding = 'lg',
  animated = true,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle = {
    background: glass 
      ? 'rgba(255, 255, 255, 0.7)' 
      : gradient 
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
        : '#ffffff',
    backdropFilter: glass ? 'blur(20px) saturate(180%)' : 'none',
    WebkitBackdropFilter: glass ? 'blur(20px) saturate(180%)' : 'none',
    borderRadius: '16px',
    boxShadow: isHovered && (hover || onClick)
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(99, 102, 241, 0.1)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: glass 
      ? '1px solid rgba(255, 255, 255, 0.3)' 
      : gradient
        ? 'none'
        : '1px solid rgba(226, 232, 240, 0.8)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
    padding: padding === 'sm' ? '16px' : padding === 'md' ? '24px' : padding === 'lg' ? '32px' : padding,
    position: 'relative',
    overflow: 'hidden',
    transform: isHovered && (hover || onClick) ? 'translateY(-4px)' : 'translateY(0)',
    willChange: 'transform, box-shadow',
  };

  return (
    <div
      className={`card ${animated ? 'animate-fadeIn' : ''} ${className}`}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hover || onClick) {
          setIsHovered(true);
        }
      }}
      onMouseLeave={(e) => {
        if (hover || onClick) {
          setIsHovered(false);
        }
      }}
      {...props}
    >
      {/* Animated gradient overlay on hover */}
      {(hover || onClick) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isHovered
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.03) 100%)'
              : 'transparent',
            pointerEvents: 'none',
            transition: 'opacity 0.4s ease',
            opacity: isHovered ? 1 : 0,
            borderRadius: '16px',
          }}
        />
      )}

      {/* Shine effect on hover */}
      {(hover || onClick) && isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
            animation: 'shimmer 2s infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default Card;

