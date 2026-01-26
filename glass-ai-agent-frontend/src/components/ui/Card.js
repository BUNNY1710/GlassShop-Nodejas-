import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

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
  // Hook must be called at top level
  const { isMobile } = useResponsive();
  
  // Responsive padding - smaller on mobile
  const getPadding = () => {
    if (isMobile) {
      return padding === 'sm' ? '12px' : padding === 'md' ? '16px' : padding === 'lg' ? '20px' : padding;
    }
    return padding === 'sm' ? '16px' : padding === 'md' ? '24px' : padding === 'lg' ? '32px' : padding;
  };

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
    padding: getPadding(),
    position: 'relative',
    overflow: 'hidden',
  };

  const hoverStyle = hover || onClick ? {
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    }
  } : {};

  // Extract style from props and merge properly to avoid padding conflicts
  const { style: propsStyle, ...restProps } = props;
  
  // Remove any padding-related properties from props.style to avoid conflicts
  const cleanPropsStyle = propsStyle ? Object.keys(propsStyle).reduce((acc, key) => {
    if (!key.toLowerCase().includes('padding')) {
      acc[key] = propsStyle[key];
    }
    return acc;
  }, {}) : {};

  // Merge styles: baseStyle takes precedence, then cleanPropsStyle
  const mergedStyle = {
    ...cleanPropsStyle,
    ...baseStyle,
  };

  return (
    <div
      className={`card ${className}`}
      style={mergedStyle}
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
      {...restProps}
    >
      {children}
    </div>
  );
};

export default Card;

