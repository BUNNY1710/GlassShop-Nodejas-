import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

const Input = ({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  size = 'md',
  ...props
}) => {
  // Responsive input - ensure minimum 16px font to prevent iOS zoom
  const { isMobile } = useResponsive();
  const baseStyle = {
    width: fullWidth ? '100%' : 'auto',
    padding: size === 'sm' 
      ? (isMobile ? '12px 16px' : '10px 14px')
      : size === 'lg' 
        ? (isMobile ? '18px 20px' : '16px 20px')
        : (isMobile ? '14px 18px' : '12px 16px'),
    fontSize: '16px', // Always 16px minimum to prevent iOS zoom
    borderRadius: '12px',
    border: error ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    minHeight: isMobile ? '44px' : 'auto', // Minimum touch target
  };

  const inputWrapperStyle = {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: helperText || error ? '20px' : '0',
  };

  const iconStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    ...(iconPosition === 'left' ? { left: '14px' } : { right: '14px' }),
    fontSize: '18px',
    color: '#94a3b8',
    pointerEvents: 'none',
  };

  // Calculate padding values to avoid shorthand/non-shorthand conflict
  const getPaddingValues = () => {
    const paddingValue = size === 'sm' 
      ? (isMobile ? '12px 16px' : '10px 14px')
      : size === 'lg' 
        ? (isMobile ? '18px 20px' : '16px 20px')
        : (isMobile ? '14px 18px' : '12px 16px');
    
    const [paddingTopBottom, paddingLeftRight] = paddingValue.split(' ');
    
    if (icon && iconPosition === 'left') {
      return {
        paddingTop: paddingTopBottom,
        paddingBottom: paddingTopBottom,
        paddingLeft: '44px',
        paddingRight: paddingLeftRight,
      };
    } else if (icon && iconPosition === 'right') {
      return {
        paddingTop: paddingTopBottom,
        paddingBottom: paddingTopBottom,
        paddingLeft: paddingLeftRight,
        paddingRight: '44px',
      };
    } else {
      return {
        padding: paddingValue,
      };
    }
  };

  const inputWithIconStyle = {
    ...baseStyle,
    // Remove padding shorthand to avoid conflict
    padding: undefined,
    ...getPaddingValues(),
  };

  return (
    <div style={inputWrapperStyle}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: '#475569',
            marginBottom: '8px',
          }}
        >
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        {icon && iconPosition === 'left' && (
          <span style={iconStyle}>{icon}</span>
        )}
        
        <input
          style={inputWithIconStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? '#ef4444' : '#667eea';
            e.currentTarget.style.boxShadow = error 
              ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
              : '0 0 0 3px rgba(102, 126, 234, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#ef4444' : '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <span style={iconStyle}>{icon}</span>
        )}
      </div>
      
      {(error || helperText) && (
        <div
          style={{
            fontSize: '12px',
            marginTop: '6px',
            color: error ? '#dc2626' : '#64748b',
            fontWeight: error ? '500' : '400',
          }}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default Input;

