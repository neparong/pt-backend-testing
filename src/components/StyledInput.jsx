import React from 'react';
import { IconSymbol } from './IconSymbol';

export function StyledInput({ icon, placeholder, value, onChangeText, type = "text" }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '0 12px',
      height: '50px',
      marginBottom: '16px',
      backgroundColor: 'white'
    }}>
      {/* The Icon on the left */}
      <div style={{ marginRight: '10px', display: 'flex' }}>
        <IconSymbol name={icon} size={20} color="#687076" />
      </div>

      {/* The actual Input field */}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: '16px',
          color: '#11181C',
          height: '100%'
        }}
      />
    </div>
  );
}