import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '600',
    borderRadius: '12px',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'inherit',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled || loading ? 0.6 : 1,
  };

  // Responsive button sizes - larger touch targets on mobile
  const { isMobile } = useResponsive();
  const sizeStyles = {
    sm: { 
      padding: isMobile ? '12px 18px' : '10px 16px', 
      fontSize: isMobile ? '15px' : '14px', // Prevent iOS zoom (min 16px)
      minHeight: isMobile ? '44px' : '40px' // Minimum touch target
    },
    md: { 
      padding: isMobile ? '14px 24px' : '14px 24px', 
      fontSize: isMobile ? '16px' : '15px', 
      minHeight: isMobile ? '48px' : '48px' 
    },
    lg: { 
      padding: isMobile ? '18px 32px' : '16px 32px', 
      fontSize: isMobile ? '17px' : '16px', 
      minHeight: isMobile ? '52px' : '56px' 
    },
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    },
    success: {
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
    },
    outline: {
      background: 'transparent',
      color: '#667eea',
      border: '2px solid #667eea',
      boxShadow: 'none',
    },
    ghost: {
      background: 'transparent',
      color: '#64748b',
      boxShadow: 'none',
    },
    secondary: {
      background: '#f1f5f9',
      color: '#475569',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
  };

  const combinedStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      style={combinedStyle}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          if (variant !== 'ghost' && variant !== 'outline') {
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = combinedStyle.boxShadow;
        }
      }}
      {...props}
    >
      {loading ? (
        <>
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span>{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span>{icon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;

