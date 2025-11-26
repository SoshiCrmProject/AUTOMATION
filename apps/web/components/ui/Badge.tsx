import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error' | 'default';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon 
}) => {
  const baseClass = 'badge';
  const variantClass = variant !== 'default' ? `badge-${variant}` : '';

  const sizeStyles = {
    sm: { padding: '4px 10px', fontSize: '11px' },
    md: { padding: '6px 14px', fontSize: '12px' },
    lg: { padding: '8px 18px', fontSize: '13px' },
  };

  return (
    <span className={`${baseClass} ${variantClass}`} style={sizeStyles[size]}>
      {icon && <span style={{ marginRight: '4px' }}>{icon}</span>}
      {children}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'processing';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const statusMap = {
    active: { variant: 'success' as const, icon: '●', text: label || 'Active' },
    inactive: { variant: 'default' as const, icon: '○', text: label || 'Inactive' },
    pending: { variant: 'warning' as const, icon: '◐', text: label || 'Pending' },
    completed: { variant: 'success' as const, icon: '✓', text: label || 'Completed' },
    failed: { variant: 'error' as const, icon: '✕', text: label || 'Failed' },
    processing: { variant: 'info' as const, icon: '⟳', text: label || 'Processing' },
  };

  const config = statusMap[status];

  return (
    <Badge variant={config.variant} icon={<span>{config.icon}</span>}>
      {config.text}
    </Badge>
  );
};
