import React from 'react';

export function UserAvatar({
  avatarUrl,
  displayName,
  username,
  className = "w-10 h-10",
  size = 10,
  style = {},
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? username ?? 'Avatar'}
        className={`${className} rounded-full object-cover`}
        style={style}
      />
    );
  }

  const name = displayName || username || '?';
  const firstLetter = name.trim().charAt(0).toUpperCase();

  // Vibrant gradient colors mapped dynamically by string hashing
  const colors = [
    'linear-gradient(135deg, #ec4899, #f43f5e)', // Pink/rose
    'linear-gradient(135deg, #8b5cf6, #d946ef)', // Purple/fuchsia
    'linear-gradient(135deg, #3b82f6, #06b6d4)', // Blue/cyan
    'linear-gradient(135deg, #10b981, #14b8a6)', // Green/teal
    'linear-gradient(135deg, #f59e0b, #eab308)', // Orange/yellow
    'linear-gradient(135deg, #ef4444, #f97316)', // Red/orange
    'linear-gradient(135deg, #6366f1, #8b5cf6)', // Indigo/purple
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const background = colors[colorIndex];

  return (
    <div
      className={`${className} rounded-full flex items-center justify-center font-bold text-white select-none`}
      style={{
        background,
        fontSize: `${Math.max(12, size * 2.8)}px`,
        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        ...style,
      }}
    >
      {firstLetter}
    </div>
  );
}
