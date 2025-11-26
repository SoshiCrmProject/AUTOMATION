import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  height?: string;
  showValues?: boolean;
  title?: string;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ 
  data, 
  height = '300px',
  showValues = true,
  title
}) => {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="chart-container" style={{ width: '100%' }}>
      {title && (
        <h4 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '16px', 
          fontWeight: 700,
          color: 'var(--color-text)'
        }}>
          {title}
        </h4>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height, padding: '10px' }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {showValues && (
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: item.color || 'var(--color-primary)',
                  }}
                >
                  {item.value.toLocaleString()}
                </div>
              )}
              <div
                style={{
                  width: '100%',
                  height: `${barHeight}%`,
                  background: `linear-gradient(180deg, ${item.color || 'var(--color-primary)'}, ${item.color || 'var(--color-primary-dark)'})`,
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  minHeight: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scaleY(1.05)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scaleY(1)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              />
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SimplePieChartProps {
  data: DataPoint[];
  size?: number;
  showLegend?: boolean;
  title?: string;
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({
  data,
  size = 200,
  showLegend = true,
  title
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  const colors = [
    'var(--color-primary)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-error)',
    'var(--color-secondary)',
    'var(--color-info)',
  ];

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <h4 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '16px', 
          fontWeight: 700,
          color: 'var(--color-text)'
        }}>
          {title}
        </h4>
      )}
      <div style={{ display: 'flex', flexDirection: showLegend ? 'row' : 'column', alignItems: 'center', gap: '24px' }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            const startX = size / 2 + (size / 2) * Math.cos((startAngle - 90) * (Math.PI / 180));
            const startY = size / 2 + (size / 2) * Math.sin((startAngle - 90) * (Math.PI / 180));
            const endX = size / 2 + (size / 2) * Math.cos((currentAngle - 90) * (Math.PI / 180));
            const endY = size / 2 + (size / 2) * Math.sin((currentAngle - 90) * (Math.PI / 180));
            const largeArc = angle > 180 ? 1 : 0;

            const path = `M ${size / 2} ${size / 2} L ${startX} ${startY} A ${size / 2} ${size / 2} 0 ${largeArc} 1 ${endX} ${endY} Z`;

            return (
              <path
                key={index}
                d={path}
                fill={item.color || colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              />
            );
          })}
        </svg>

        {showLegend && (
          <div style={{ flex: 1 }}>
            {data.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: 'var(--radius-sm)',
                    background: item.color || colors[index % colors.length],
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {item.value.toLocaleString()} ({((item.value / total) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface TrendLineProps {
  data: Array<{ label: string; value: number }>;
  height?: string;
  showDots?: boolean;
  color?: string;
  title?: string;
}

export const TrendLine: React.FC<TrendLineProps> = ({
  data,
  height = '200px',
  showDots = true,
  color = 'var(--color-primary)',
  title
}) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <h4 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '16px', 
          fontWeight: 700,
          color: 'var(--color-text)'
        }}>
          {title}
        </h4>
      )}
      <div style={{ position: 'relative', height, padding: '10px' }}>
        <svg
          width="100%"
          height="100%"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'visible',
          }}
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
        >
          {/* Line */}
          <polyline
            points={data
              .map((item, index) => {
                const x = (index / (data.length - 1)) * 1000;
                const y = 200 - ((item.value - minValue) / range) * 180;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Area under line */}
          <polygon
            points={`${data
              .map((item, index) => {
                const x = (index / (data.length - 1)) * 1000;
                const y = 200 - ((item.value - minValue) / range) * 180;
                return `${x},${y}`;
              })
              .join(' ')} 1000,200 0,200`}
            fill={color}
            opacity="0.1"
          />

          {/* Dots */}
          {showDots &&
            data.map((item, index) => {
              const x = (index / (data.length - 1)) * 1000;
              const y = 200 - ((item.value - minValue) / range) * 180;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="5"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
        </svg>

        {/* Labels */}
        <div style={{ position: 'absolute', bottom: '-24px', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
          {data.map((item, index) => (
            <div
              key={index}
              style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
