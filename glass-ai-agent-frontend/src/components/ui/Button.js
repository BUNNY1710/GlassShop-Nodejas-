import React, { useState } from 'react';

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
  const [ripples, setRipples] = useState([]);

  const createRipple = (event) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    };
    
    setRipples([...ripples, newRipple]);
    
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      createRipple(e);
      onClick(e);
    }
  };

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
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
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    willChange: 'transform, box-shadow',
  };

  const sizeStyles = {
    sm: { padding: '10px 18px', fontSize: '14px', minHeight: '40px', gap: '8px' },
    md: { padding: '14px 28px', fontSize: '15px', minHeight: '48px', gap: '10px' },
    lg: { padding: '18px 36px', fontSize: '16px', minHeight: '56px', gap: '12px' },
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      backgroundSize: '200% 200%',
      color: '#ffffff',
      boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4), 0 2px 4px -1px rgba(102, 126, 234, 0.2)',
      border: 'none',
    },
    success: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.4)',
      border: 'none',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.4)',
      border: 'none',
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
      border: 'none',
    },
    secondary: {
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      color: '#475569',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
    },
  };

  const combinedStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  const hoverStyles = {
    primary: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px 0 rgba(102, 126, 234, 0.5), 0 4px 8px -2px rgba(102, 126, 234, 0.3)',
      backgroundPosition: '100% 50%',
    },
    success: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px 0 rgba(16, 185, 129, 0.5)',
    },
    danger: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px 0 rgba(239, 68, 68, 0.5)',
    },
    outline: {
      transform: 'translateY(-2px)',
      background: '#667eea',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
    },
    ghost: {
      background: 'rgba(99, 102, 241, 0.1)',
      color: '#4f46e5',
    },
    secondary: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    },
  };

  const activeStyles = {
    transform: 'translateY(0) scale(0.98)',
  };

  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      style={combinedStyle}
      onClick={handleClick}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyles[variant]);
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = combinedStyle.boxShadow;
          e.currentTarget.style.background = combinedStyle.background;
          e.currentTarget.style.backgroundPosition = '0% 50%';
          if (variant === 'outline') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = combinedStyle.color;
          }
          if (variant === 'ghost') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = combinedStyle.color;
          }
        }
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, activeStyles);
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = hoverStyles[variant]?.transform || 'translateY(0)';
        }
      }}
      {...props}
    >
      {/* Ripple Effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            width: `${ripple.size}px`,
            height: `${ripple.size}px`,
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            pointerEvents: 'none',
            animation: 'ripple 0.6s ease-out',
            transform: 'scale(0)',
          }}
        />
      ))}

      {/* Shimmer Effect on Primary */}
      {variant === 'primary' && !disabled && !loading && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            transition: 'left 0.5s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.left = '100%';
          }}
        />
      )}

      {loading ? (
        <>
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ opacity: 0.9 }}>Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '18px' }}>{icon}</span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '18px' }}>{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;

