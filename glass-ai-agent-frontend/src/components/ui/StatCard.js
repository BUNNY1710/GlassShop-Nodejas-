import React from 'react';
import Card from './Card';

const StatCard = ({ 
  icon, 
  label, 
  value, 
  color = '#6366f1', 
  loading = false,
  trend,
  subtitle 
}) => {
  const iconBg = {
    background: `linear-gradient(135deg, ${color}15, ${color}25)`,
    color: color,
  };

  return (
    <Card hover className="stat-card" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Decorative gradient circle */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: '600',
            ...iconBg,
            boxShadow: `0 4px 12px ${color}20`,
          }}
        >
          {icon}
        </div>
        
        {trend && (
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              background: trend > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: trend > 0 ? '#16a34a' : '#dc2626',
            }}
          >
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}
        >
          {label}
        </div>
        
        {loading ? (
          <div
            style={{
              height: '32px',
              width: '120px',
              borderRadius: '8px',
              background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: '36px',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: '1.2',
              marginBottom: subtitle ? '4px' : '0',
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        )}
        
        {subtitle && (
          <div
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              marginTop: '4px',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatCard;

