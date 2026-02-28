import React from 'react';
import { getAvatarHtml } from '@/core/utils/helpers';

interface Props {
  src?: string;
  name: string;
  className?: string; // Should include width and height classes e.g. "w-10 h-10"
  textSize?: string;
  onClick?: () => void;
}

const Avatar: React.FC<Props> = ({ src, name, className = "w-10 h-10", textSize = "text-xs", onClick }) => {
  const avatarData = getAvatarHtml(name, src || "");
  
  const commonClasses = `rounded-full shadow-sm flex-shrink-0 ${className}`;

  if (avatarData.type === 'img') {
    return (
      <img 
        src={avatarData.src} 
        alt={name} 
        className={`${commonClasses} object-cover bg-slate-100 dark:bg-dark-surface transition-colors`} 
        loading="lazy"
        onClick={onClick}
      />
    );
  }

  return (
    <div 
        className={`${commonClasses} bg-primary text-neutral-white flex items-center justify-center font-bold ${textSize} transition-colors uppercase`}
        onClick={onClick}
    >
      {avatarData.text}
    </div>
  );
};

export default Avatar;