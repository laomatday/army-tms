import React, { useState, useRef } from 'react';
import { triggerHaptic } from '@/core/utils/helpers';
import Spinner from '@/shared/components/common/Spinner';

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const PullToRefresh: React.FC<Props> = ({ onRefresh, children, className = "", style = {} }) => {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY.current;
      if (contentRef.current?.scrollTop === 0 && deltaY > 10) {
          setPullY(Math.min((deltaY - 10) * 0.4, 120)); 
      }
  };

  const handleTouchEnd = async () => {
      if (pullY > 60) {
          setIsRefreshing(true);
          setPullY(60); 
          triggerHaptic('medium');
          await onRefresh();
          triggerHaptic('success');
          setIsRefreshing(false);
          setPullY(0);
      } else {
          setPullY(0);
      }
  };

  return (
    <div 
        ref={contentRef}
        className={`absolute inset-0 overflow-y-auto no-scrollbar pt-safe pb-safe ${className}`}
        style={style}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
        <div 
            className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 absolute top-0 left-0 z-0 pointer-events-none"
            style={{ height: `${pullY}px`, opacity: Math.min(pullY / 40, 1) }}
        >
            {isRefreshing ? (
                 <Spinner size="md" color="border-t-primary" />
            ) : (
                 <i className="fa-solid fa-arrow-down text-primary text-xl animate-bounce"></i>
            )}
        </div>

        <div style={{ transform: `translateY(${pullY}px)`, transition: isRefreshing ? 'transform 0.2s' : 'transform 0s' }} className="relative z-10 min-h-full">
            {children}
        </div>
    </div>
  );
};

export default PullToRefresh;