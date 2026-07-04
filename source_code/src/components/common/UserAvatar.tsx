import React from 'react';

interface UserAvatarProps {
    avatar?: string;
    name: string;
    size?: number;
    fontSize?: string;
    style?: React.CSSProperties;
}

export const AVATAR_GRADIENTS = [
    { id: 'gradient:1', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }, // Indigo-Purple
    { id: 'gradient:2', background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }, // Rose-Orange
    { id: 'gradient:3', background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' }, // Emerald-Teal
    { id: 'gradient:4', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }, // Blue-Indigo
    { id: 'gradient:5', background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }, // Amber-Red
    { id: 'gradient:6', background: 'linear-gradient(135deg, #d946ef 0%, #ec4899 100%)' }, // Fuchsia-Pink
    { id: 'gradient:7', background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }, // Slate-Gray
    { id: 'gradient:8', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' }  // Purple-Pink
];

const UserAvatar: React.FC<UserAvatarProps> = ({ avatar, name, size = 40, fontSize, style }) => {
    const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

    // Check if avatar is a gradient preset
    const gradientPreset = AVATAR_GRADIENTS.find(g => g.id === avatar);

    const baseStyle: React.CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fontSize || `${Math.max(12, Math.floor(size * 0.45))}px`,
        fontWeight: '700',
        color: '#ffffff',
        overflow: 'hidden',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        border: '1.5px solid rgba(255, 255, 255, 0.08)',
        ...style
    };

    if (avatar && avatar.startsWith('data:image/')) {
        return (
            <img 
                src={avatar} 
                alt={`${name} Avatar`} 
                style={{ 
                    ...baseStyle, 
                    objectFit: 'cover', 
                    border: '1.5px solid rgba(255, 255, 255, 0.15)' 
                }} 
            />
        );
    }

    if (gradientPreset) {
        return (
            <div style={{ ...baseStyle, background: gradientPreset.background }}>
                {initial}
            </div>
        );
    }

    // Default fallback gradient if nothing matched
    return (
        <div style={{ ...baseStyle, background: 'linear-gradient(135deg, #64748b 0%, #334155 100%)' }}>
            {initial}
        </div>
    );
};

export default UserAvatar;
