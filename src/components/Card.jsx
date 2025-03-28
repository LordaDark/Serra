import React from 'react';

const Card = ({ title, value, status, children }) => {
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
    <div className="card" style={{ borderColor: getStatusColor() }}>
      <h3 className="card-title">{title}</h3>
      {value && <p className="card-value" style={{ color: getStatusColor() }}>{value}</p>}
      {children}
    </div>
  );
};

export default Card;