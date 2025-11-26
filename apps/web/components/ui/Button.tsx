import React, { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = variant !== 'primary' ? `btn-${variant}` : '';
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  const widthClass = fullWidth ? 'btn-full' : '';

  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '13px' },
    md: { padding: '12px 24px', fontSize: '14px' },
    lg: { padding: '16px 32px', fontSize: '16px' },
  };

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      disabled={disabled || loading}
      style={{
        ...sizeStyles[size],
        width: fullWidth ? '100%' : 'auto',
        opacity: (disabled || loading) ? 0.6 : 1,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
      }}
      {...props}
    >
      {loading && <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
      {!loading && icon && <span>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label?: string;
  variant?: 'ghost' | 'primary' | 'danger';
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  label, 
  variant = 'ghost',
  className = '',
  ...props 
}) => {
  return (
    <button
      className={`${variant === 'ghost' ? 'btn-ghost' : 'btn'} ${className}`}
      style={{
        padding: '8px 12px',
        minWidth: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
      title={label}
      {...props}
    >
      {icon}
      {label && <span style={{ fontSize: '13px' }}>{label}</span>}
    </button>
  );
};
