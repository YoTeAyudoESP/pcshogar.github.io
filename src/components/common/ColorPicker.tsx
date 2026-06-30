import React from 'react';

interface ColorPickerProps {
    selectedColor: string;
    onColorSelect: (color: string) => void;
    label?: string;
}

const COLORS = [
    '#3b82f6', // Bright Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#facc15', // Yellow
    '#a855f7', // Purple
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#475569', // Slate
    'var(--color-success)', // Emerald
    '#4ade80', // Light Green
    '#38bdf8', // Light Blue
    '#c084fc', // Light Purple
    '#1e293b', // Dark Slate
    '#f59e0b', // Amber
];

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorSelect, label }) => {
    return (
        <div style={{ marginBottom: '1.5rem' }}>
            {label && <label style={{ display: 'block', marginBottom: '1rem', color: 'rgba(var(--color-rgb-light), 0.6)', fontSize: '0.9rem' }}>{label}</label>}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', 
                gap: '0.75rem',
                justifyItems: 'center'
            }}>
                {COLORS.map(color => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onColorSelect(color)}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: color,
                            border: selectedColor === color ? '3px solid white' : 'none',
                            boxShadow: selectedColor === color ? `0 0 10px ${color}` : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                            padding: 0
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default ColorPicker;
