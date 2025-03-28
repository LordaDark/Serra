import React from 'react';

const ProgressBar = ({ value, min, max, status }) => {
  // Calculate precise percentage based on min/max thresholds
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  
  const getStatusColor = () => {
    switch (status) {
      case 'danger':
        return '#ff4444';
      case 'warning':
        return '#ffbb33';
      case 'success':
        return 'var(--progress-color)';
      default:
        return 'var(--text-color)';
    }
  };

  return (
    <div className="progress-container">
      <div 
        className="progress-bar"
        style={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
          backgroundColor: getStatusColor()
        }}
      />
      <span className="progress-label" style={{ color: getStatusColor() }}>
        {value}
      </span>
    </div>
  );
};

export default ProgressBar;