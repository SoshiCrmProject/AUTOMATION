import React, { useState } from 'react';
import { Input } from './Input';
import { Select } from './Input';
import { Button } from './Button';

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface SearchFilterProps {
  fields: FilterField[];
  onFilter: (filters: Record<string, any>) => void;
  onClear?: () => void;
  initialFilters?: Record<string, any>;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  fields,
  onFilter,
  onClear,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onFilter(filters);
  };

  const handleClear = () => {
    setFilters({});
    onClear?.();
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== '' && v !== undefined).length;

  return (
    <div className="search-filter card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '20px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            🔍 Filters
          </h4>
          {activeFilterCount > 0 && (
            <span className="badge badge-info" style={{ fontSize: '11px' }}>
              {activeFilterCount} active
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-ghost"
          style={{ padding: '8px 12px', fontSize: '13px' }}
        >
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {isExpanded && (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {fields.map((field) => {
              if (field.type === 'select' && field.options) {
                return (
                  <Select
                    key={field.key}
                    label={field.label}
                    value={filters[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    options={[{ value: '', label: 'All' }, ...field.options]}
                  />
                );
              }

              return (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type}
                  value={filters[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={handleClear}>
              Clear All
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </div>
        </>
      )}
    </div>
  );
};

interface QuickSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  icon?: React.ReactNode;
}

export const QuickSearch: React.FC<QuickSearchProps> = ({
  placeholder = 'Search...',
  onSearch,
  icon = '🔍',
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        icon={icon}
      />
    </div>
  );
};
