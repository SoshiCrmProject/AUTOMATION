import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const sizeMap = {
    sm: '20px',
    md: '32px',
    lg: '48px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px' }}>
      <div
        className="spinner"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderWidth: size === 'sm' ? '2px' : size === 'md' ? '3px' : '4px',
        }}
      />
      {text && <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>{text}</p>}
    </div>
  );
};

interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '20px', 
  variant = 'rectangular',
  count = 1 
}) => {
  const getStyle = () => {
    const baseStyle = {
      width,
      height,
      background: 'linear-gradient(90deg, var(--color-elevated) 25%, var(--color-border-light) 50%, var(--color-elevated) 75%)',
      backgroundSize: '200% 100%',
      animation: 'loading 1.5s ease-in-out infinite',
    };

    if (variant === 'circular') {
      return { ...baseStyle, borderRadius: '50%' };
    }
    if (variant === 'text') {
      return { ...baseStyle, borderRadius: 'var(--radius-sm)', height: '16px' };
    }
    return { ...baseStyle, borderRadius: 'var(--radius-md)' };
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ ...getStyle(), marginBottom: count > 1 ? '12px' : '0' }} />
      ))}
    </>
  );
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = '📭', 
  title, 
  description, 
  action 
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 40px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}>{icon}</div>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
        {title}
      </h3>
      {description && (
        <p style={{ margin: '0 0 24px 0', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ variant, title, children, onClose }) => {
  const variantStyles = {
    info: { bg: 'var(--color-info-bg)', border: 'var(--color-info)', color: '#1e40af' },
    success: { bg: 'var(--color-success-bg)', border: 'var(--color-success)', color: '#065f46' },
    warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning)', color: '#92400e' },
    error: { bg: 'var(--color-error-bg)', border: 'var(--color-error)', color: '#991b1b' },
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  const style = variantStyles[variant];

  return (
    <div
      className="alert"
      style={{
        background: style.bg,
        borderLeft: `4px solid ${style.border}`,
        color: style.color,
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '20px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>{icons[variant]}</span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: '4px' }}>{title}</div>}
        <div style={{ fontSize: '14px', lineHeight: 1.5 }}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'inherit',
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};
