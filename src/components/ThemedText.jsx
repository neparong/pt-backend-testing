import React from 'react';

export function ThemedText({ type = 'default', children, style, className = "", onClick }) {
  // We map your mobile "types" to standard CSS styles
  const styles = {
    default: { fontSize: '16px', lineHeight: '24px', color: 'var(--text-light)' },
    title: { fontSize: '32px', fontWeight: 'bold', lineHeight: '1.2', color: 'var(--text-light)' },
    defaultSemiBold: { fontSize: '16px', fontWeight: '600', lineHeight: '24px' },
    subtitle: { fontSize: '20px', fontWeight: 'bold' },
    link: { fontSize: '16px', lineHeight: '24px', color: '#0a7ea4', cursor: 'pointer', textDecoration: 'underline' },
  };

  // Merge the base style with any custom style passed in
  const finalStyle = { ...styles[type], ...style };

  return (
    <div className={className} style={finalStyle} onClick={onClick}>
      {children}
    </div>
  );
}