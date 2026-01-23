import React from 'react';

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
  const baseStyle = {
    width: fullWidth ? '100%' : 'auto',
    padding: size === 'sm' ? '10px 14px' : size === 'lg' ? '16px 20px' : '12px 16px',
    fontSize: '16px', // Prevent iOS zoom
    borderRadius: '12px',
    border: error ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#0f172a',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    willChange: 'transform, box-shadow, border-color',
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

  const inputWithIconStyle = {
    ...baseStyle,
    ...(icon && iconPosition === 'left' ? { paddingLeft: '44px' } : {}),
    ...(icon && iconPosition === 'right' ? { paddingRight: '44px' } : {}),
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
              ? '0 0 0 4px rgba(239, 68, 68, 0.1), 0 4px 6px -1px rgba(239, 68, 68, 0.1)' 
              : '0 0 0 4px rgba(102, 126, 234, 0.1), 0 4px 6px -1px rgba(102, 126, 234, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderWidth = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#ef4444' : '#e2e8f0';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderWidth = '1.5px';
          }}
          onMouseEnter={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = error ? '#ef4444' : '#cbd5e1';
            }
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = error ? '#ef4444' : '#e2e8f0';
            }
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

