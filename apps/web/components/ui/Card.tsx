import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = true, gradient = false, onClick }) => {
  const baseClass = gradient
    ? 'card gradient-card'
    : 'card';
  const hoverClass = hover ? 'card-hover' : '';
  const clickable = onClick ? 'cursor-pointer' : '';

  return (
    <div 
      className={`${baseClass} ${hoverClass} ${clickable} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon }) => {
  return (
    <div className="card-header" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      marginBottom: subtitle ? '8px' : '16px',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--color-border-light)'
    }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 700,
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {icon && <span style={{ fontSize: '24px' }}>{icon}</span>}
          {title}
        </h3>
        {subtitle && (
          <p style={{ 
            margin: '6px 0 0 0', 
            fontSize: '13px', 
            color: 'var(--color-text-muted)' 
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon, color = 'primary' }) => {
  const colorMap = {
    primary: 'var(--color-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
  };

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 700, 
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </span>
        {icon && (
          <span style={{ 
            fontSize: '32px', 
            opacity: 0.2,
            color: colorMap[color]
          }}>
            {icon}
          </span>
        )}
      </div>
      <div style={{ 
        fontSize: '32px', 
        fontWeight: 900, 
        color: colorMap[color],
        marginBottom: '8px',
        lineHeight: 1
      }}>
        {value}
      </div>
      {trend !== undefined && (
        <div style={{ 
          fontSize: '13px', 
          color: trend >= 0 ? 'var(--color-success)' : 'var(--color-error)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 600
        }}>
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}%</span>
          <span style={{ color: 'var(--color-text-light)', fontWeight: 400, marginLeft: '4px' }}>vs last period</span>
        </div>
      )}
    </div>
  );
};
