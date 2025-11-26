import React, { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  fullWidth = true,
  className = '',
  ...props
}) => {
  return (
    <div className="form-group" style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            fontSize: '18px',
            pointerEvents: 'none'
          }}>
            {icon}
          </div>
        )}
        <input
          className={`input ${error ? 'input-error' : ''} ${className}`}
          style={{
            paddingLeft: icon ? '40px' : '16px',
            borderColor: error ? 'var(--color-error)' : 'var(--color-border)',
          }}
          {...props}
        />
      </div>
      {hint && !error && (
        <span style={{ 
          fontSize: '12px', 
          color: 'var(--color-text-light)', 
          marginTop: '4px', 
          display: 'block' 
        }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ 
          fontSize: '12px', 
          color: 'var(--color-error)', 
          marginTop: '4px', 
          display: 'block',
          fontWeight: 500
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  fullWidth = true,
  className = '',
  ...props
}) => {
  return (
    <div className="form-group" style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
          {label}
        </label>
      )}
      <textarea
        className={`input ${error ? 'input-error' : ''} ${className}`}
        style={{
          borderColor: error ? 'var(--color-error)' : 'var(--color-border)',
          minHeight: '100px',
          resize: 'vertical'
        }}
        {...props}
      />
      {hint && !error && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px', display: 'block' }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '4px', display: 'block', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  options: Array<{ value: string | number; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  fullWidth = true,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="form-group" style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
          {label}
        </label>
      )}
      <select
        className={`select ${error ? 'input-error' : ''} ${className}`}
        style={{
          borderColor: error ? 'var(--color-error)' : 'var(--color-border)',
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px', display: 'block' }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '4px', display: 'block', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
};
