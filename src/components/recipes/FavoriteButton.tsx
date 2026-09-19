import React from 'react';

interface FavoriteButtonProps {
  isFavorited: boolean;
  onToggle: () => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ isFavorited, onToggle }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={isFavorited ? '取消收藏' : '加入收藏'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
        color: isFavorited ? '#ef4444' : '#d1d5db',
        padding: '4px'
      }}
    >
      {isFavorited ? '❤️' : '🤍'}
    </button>
  );
};