import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import Modal from './Modal';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'date';
    placeholder?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  submitLabel?: string;
  cancelLabel?: string;
}

export default function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields,
  size = 'md',
  submitLabel,
  cancelLabel,
}: FormModalProps) {
  const { t } = useTranslation('common');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit(formData);
      setFormData({});
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size={size}>
      <form onSubmit={handleSubmit} className="form-modal">
        {error && (
          <div className="alert alert-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="form-grid">
          {fields.map((field) => (
            <div key={field.name} className="form-group">
              <label htmlFor={field.name} className="form-label">
                {field.label}
                {field.required && <span className="text-danger"> *</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  id={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="form-select"
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                  className="form-textarea"
                />
              ) : (
                <input
                  id={field.name}
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) =>
                    handleChange(
                      field.name,
                      field.type === 'number' ? Number(e.target.value) : e.target.value
                    )
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                  className="form-input"
                />
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            {cancelLabel || t('cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('saving') : submitLabel || t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
