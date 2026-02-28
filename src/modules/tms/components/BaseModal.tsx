import React, { useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  className?: string;
}

const BaseModal: React.FC<Props> = ({ 
    isOpen, 
    onClose, 
    children, 
    title, 
    subtitle, 
    showCloseButton = true,
    className = ""
}) => {
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const touchEnd = useRef<{x: number, y: number} | null>(null);

  if (!isOpen) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
     touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !touchEnd.current) return;
    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    
    if (Math.abs(distanceX) > Math.abs(distanceY) && distanceX < -60) { // Swipe right
         e.stopPropagation();
         onClose();
    }
  };

  return (
    <div 
        className={`fixed inset-0 z-[60] bg-slate-50 dark:bg-dark-bg flex flex-col font-sans animate-slide-up transition-colors duration-300 ${className}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
        {showCloseButton && (
            <div className="fixed top-0 right-0 pt-safe p-4 z-[70]">
                <button onClick={onClose} className="w-10 h-10 bg-neutral-white/60 dark:bg-dark-surface/60 rounded-full flex items-center justify-center text-slate-600 dark:text-dark-text-secondary hover:bg-neutral-white dark:hover:bg-dark-surface/80 transition-colors border border-white/20 dark:border-dark-border active:scale-95 shadow-sm">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
        )}

        {title && (
             <div className="px-5 pt-safe pt-4 pb-2 flex items-center justify-between shrink-0 z-10 bg-slate-50/90 dark:bg-dark-bg/90 sticky top-0 backdrop-blur-md transition-colors">
                <div>
                    <h1 className="text-2xl font-black text-neutral-black dark:text-dark-text-primary tracking-tight">{title}</h1>
                    {subtitle && <p className="text-xs font-bold text-slate-400 dark:text-dark-text-secondary uppercase tracking-widest">{subtitle}</p>}
                </div>
                <div className="w-10"></div>
            </div>
        )}

        <div 
            className="flex-1 overflow-y-auto no-scrollbar" 
        >
            {children}
        </div>
    </div>
  );
};

export default BaseModal;